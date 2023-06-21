function convertFormToJSON(form, prefix="") {
  const re = new RegExp("^"+prefix);
  return form
    .serializeArray()
    .reduce(function (json, { name, value }) {
      json[name.replace(re, "")] = value;
      return json;
    }, {});
}

function convertToStringJson(form, prefix="", extras={}){
    var formjson =convertFormToJSON(form, prefix=prefix);
    formjson=Object.assign({}, formjson, extras)
    return JSON.stringify(formjson);
}

function load_errors(error_list, obj){
    ul_obj = "<ul class='errorlist form_errors d-flex justify-content-center'>";
    error_list.forEach((item)=>{
        ul_obj += "<li>"+item+"</li>";
    });
    ul_obj += "</ul>"
    $(obj).parents('.form-group').prepend(ul_obj);
    return ul_obj;
}

function form_field_errors(target_form, form_errors, prefix){
    var item = "";
    for (const [key, value] of Object.entries(form_errors)) {
        item = " #id_" +prefix+key;
        if(target_form.find(item).length > 0){
            load_errors(form_errors[key], item);
        }
    }
}

function clear_action_form(form){
    // clear switchery before the form reset so the check status doesn't get changed before the validation
    $(form).find("input[data-switchery=true]").each(function() {
        if($(this).prop("checked")){  // only reset it if it is checked
            $(this).trigger("click").prop("checked", false);
        }
    });

    $(form).trigger('reset');
    $(form).find("select option:selected").prop("selected", false);
    $(form).find("select").val(null).trigger('change');
    $(form).find("ul.form_errors").remove();
}

var gt_form_modals = {}
var gt_detail_modals = {}
var gt_crud_objs = {};
function BaseFormModal(modalid, datatableelement,  data_extras={})  {
    var modal = $(modalid);
    var form = modal.find('form');
    var prefix = form.find(".form_prefix").val();
    if(prefix.length != 0){
        prefix = prefix+"-"
    }
    return {
        "instance": modal,
        "reloadtable": true,
        "form": form,
        "url": form[0].action,
        "prefix": prefix,
        "type": "POST",
        "data_extras": data_extras,
        "init": function(){
            var myModalEl = this.instance[0];
            myModalEl.addEventListener('hidden.bs.modal', this.hidemodalevent(this))
            this.instance.find('.formadd').on('click', this.add_btn_form(this));

        },
        "add_btn_form": function(instance){
            return function(event){
                $.ajax({
                    url: instance.url,
                    type: instance.type,
                    data: convertToStringJson(instance.form, prefix=instance.prefix, extras=instance.data_extras),
                    headers: {'X-CSRFToken': getCookie('csrftoken'), 'Content-Type': "application/json"},
                    success: instance.fn_success,
                    error: instance.error
                });
            }
        },
        "success": function(instance, data){
        },
        "fn_success": function(instance){
            return function(data){
                if (instance.reloadtable){
                    datatableelement.ajax.reload();
                }
                instance.hidemodal();
                Swal.fire({
                    icon: 'success',
                    title: gettext('Success'),
                    text: data.detail,
                    timer: 1500
                });
                instance.success(instance, data);
            }
        },
        "error": function(instance){
            return function(xhr, resp, text) {
                var errors = xhr.responseJSON.errors;
                if(errors){  // form errors
                    form.find('ul.form_errors').remove();
                    form_field_errors(form, errors, instance.prefix);
                }else{ // any other error
                    Swal.fire({
                        icon: 'error',
                        title: gettext('Error'),
                        text: gettext('There was a problem performing your request. Please try again later or contact the administrator.')
                    });
                }
                instance.error(instance, xhr, resp, text);
            }
        },
        "hidemodal": function(){
            this.instance.modal('hide');
        },
        "hidemodalevent": function(instance){
            return function(event){
                clear_action_form(instance.form);
                instance.hidemodal();
            }
        },
        "showmodal": function(btninstance){
            this.instance.modal('show');
        }

    }
}
function BaseDetailModal(modal){
}

function ObjectCRUD(uniqueid, urls, datatableelement, modalids, actions, datatableinits,
    replace_as_detail={create: false,  update: true, destroy: true, list: false },
    addfilter=false
){
/**
actions:   {
    instance_action: [],
    obj_action: [
        {
                action: function ( e, dt, node, config ) {},
                text: '<i class="fa fa-eraser" aria-hidden="true"></i>',
                titleAttr: gettext('Clear Filters'),
                className: this.header_btn_class
        }
    ]

}

*/

    per_instance_actions = []
    per_obj_action = []
    if( "instance_action" in actions){
        per_instance_actions=actions.instance_action;
    }
    if( "obj_action" in actions){
        per_obj_action = actions.obj_action;
    }
    obj={
        "uniqueid": uniqueid,
        "display_text": 'display_text',
        "can_create": modalids.hasOwnProperty("create"),
        "can_destroy": urls.hasOwnProperty("destroy_url"),
        "can_list": urls.hasOwnProperty("list_url"),
        "can_update": modalids.hasOwnProperty("update"),
        "header_btn_class": 'btn-sm mr-4',
        "datatable": null,
        "create_form": null,
        "update_form": null,
        "base_update_url":null,
        "instance_actions": per_instance_actions,
        "obj_action": per_obj_action,
        "init": function(){
            if(this.can_list) this.list();
            if(this.can_create){
                this.obj_action.push({
                    action: this.create(this),
                    text: '<i class="fa fa-plus" aria-hidden="true"></i>',
                    titleAttr: gettext('Create'),
                    className: this.header_btn_class
                })
                this.create_form = BaseFormModal(modalids.create, this.datatable);
                this.create_form.init();
            }
            if(this.can_update){
                this.update_form = BaseFormModal(modalids.update, this.datatable);
                this.base_update_url = this.update_form.url;
                this.update_form.init();
            }
        },
        "create":  function(instance){
            return function(e, dt, node, config){
                instance.create_form.showmodal();
            }
        },
        "success": function(instance){
            return function(data){
                Swal.fire({
                    title: gettext('Success'),
                    text: data['detail'],
                    icon: 'success',
                    timer: 1500
                });
                instance.datatable.ajax.reload();
            }

        },
        "error": function(instance){
            return function(response) {
                let error_msg = gettext('There was a problem performing your request. Please try again later or contact the administrator.');  // any other error
                response.json().then(data => {  // there was something in the response from the API regarding validation
                    if(data['detail']){
                        error_msg = data['detail'][0];  // specific api validation errors
                    }
                })
                .finally(() => {
                    Swal.fire({
                        title: gettext('Error'),
                        text: error_msg,
                        icon: 'error'
                    });
                });
            }
        },
        "destroy": function(data, action) {
            let message = gettext("Are you sure you want to delete")
            let text = this.display_text in data ? data[this.display_text] :  gettext("This Object")
            message = `${message} "${text}"?`
            let url =  urls.destroy_url.replace('/0/', '/'+data.id+'/');
            Swal.fire({ //Confirmation for delete
                icon: "warning",
                title: gettext("Are you sure?"),
                text: message,
                confirmButtonText: gettext("Confirm"),
                showCloseButton: true,
                denyButtonText: gettext('Cancel'),
                showDenyButton: true,
                })
                .then(function(result) {
                    if (result.isConfirmed) {
                        fetch(url, {
                            method: "delete",
                            headers: {'X-CSRFToken': getCookie('csrftoken'), 'Content-Type': 'application/json'}
                            }
                            ).then(response => {
                                if(response.ok){ return response.json(); }
                                return Promise.reject(response);  // then it will go to the catch if it is an error code
                            })
                            .then(instance.success(instance))
                            .catch(instance.error(instance));
                    }
                });
        },
        "list": function(){
            /**
                This function initialize datatable
            */
            instance = this;
            if(this.can_list){
              this.obj_action.unshift({
                action: function ( e, dt, node, config ) {clearDataTableFilters(dt, id)},
                text: '<i class="fa fa-eraser" aria-hidden="true"></i>',
                titleAttr: gettext('Clear Filters'),
                className: this.header_btn_class
             })
            }
            if(!datatableinits.hasOwnProperty("buttons")){
                datatableinits['buttons'] = this.obj_action;
            }

            if(this.can_update){
                instance.instance_actions.push(
                    {
                     'name': "update",
                     'action': 'update',
                     'url': null,
                     'i_class': 'fa fa-edit',
                    }
                )
            }
            if(this.can_destroy){
                instance.instance_actions.push(
                    {
                     'name': 'destroy',
                     'action': 'destroy',
                     'url': null,
                     'i_class': 'fa fa-trash',
                    }
                )
            }
            if(!datatableinits.hasOwnProperty("columns")){
                datatableinits.columns=[];
            }
            if(!datatableinits.hasOwnProperty("columnDefs")){
                datatableinits['columnDefs'] = [
                    {
                    targets: -1,
                    title: gettext('Actions'),
                    type: 'actions',
                    className: "no-export-col",
                    orderable: false,
                    render: function(data, type, full, meta){
                        var edittext = '<div class="d-flex mt-1">';
                            for(var x=0; x<instance.instance_actions.length; x++){
                              let params = "'"+instance.uniqueid+"', "+x+", "+meta.row
                              edittext += '<i onclick="javascript:call_obj_crud_event('+params+');"';
                              edittext += ' class="'+instance.instance_actions[x].i_class+'" ></i>';
                            }

                        edittext += '</div>';
                        return edittext;
                     }
                }
                ]
            }
         this.datatable = createDataTable(datatableelement, urls.list_url, datatableinits, addfilter=addfilter);

        },
        "update": function(instance, action){
            this.update_form.url = this.base_update_url.replace('/0/', '/'+instance.pk+'/');
            this.update_form.showmodal();
        },
        "action_update": function(action, data){},
        "action_destroy": function(action, data){},
        'do_instance_action': function(action_position, instance_id){
           var data = this.datatable.row(instance_id).data(); ;
           if(action_position>=0 && action_position<instance.instance_actions.length){
                let action=instance.instance_actions[action_position];
                if(action.name in this){
                    this[action.name](data, action);
                }else{
                    this.do_action(data, action);
                }
           }
        },
        'do_action': function(data, action){
            let method = 'method' in action ? action.method : 'POST';
            let body = 'data_fn' in action ? JSON.stringify(action.data_fn(data)) : '';
            if( 'url' in action  &&  action.url !== null){
                fetch(action.url, {
                    method: method,
                    body: body,
                    headers: {'X-CSRFToken': getCookie('csrftoken'), 'Content-Type': 'application/json'}
                    }
                ).then(response => {
                    if(response.ok){ return response.json(); }
                    return Promise.reject(response);  // then it will go to the catch if it is an error code
                })
                .then(instance.success(instance))
                .catch(instance.error(instance));
            }
        }
    };
    gt_crud_objs[uniqueid] = obj;
    return obj;
}

function call_obj_crud_event(uniqueid, action_position, row_id){
    if(uniqueid in gt_crud_objs){
        gt_crud_objs[uniqueid].do_instance_action(action_position, row_id)
    }
}
