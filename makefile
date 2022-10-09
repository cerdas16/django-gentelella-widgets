.PHONY: help clean clean-pyc clean-build list test  docs release sdist

djversion = $(python setup.py -V)
setupversion = $(awk -F "'" '{print $2}' djgentelella/__init__.py)

help:
	@echo "clean-build - remove build artifacts"
	@echo "clean-pyc - remove Python file artifacts"
	@echo "lint - check style with flake8"
	@echo "test - run tests quickly with the default Python"
	@echo "docs - generate Sphinx HTML documentation, including API docs"
	@echo "release - package and upload a release"
	@echo "sdist - package"

clean: clean-build clean-pyc

clean-build:
	rm -fr build/
	rm -fr dist/
	rm -fr *.egg-info

clean-pyc:
	find . -name '*.pyc' -exec rm -f {} +
	find . -name '*.pyo' -exec rm -f {} +
	find . -name '*~' -exec rm -f {} +

lint:
	pep8 djgentelella

test:
	cd demo && python manage.py text

docs:
	$(MAKE) -C docs clean
	$(MAKE) -C docs html
	sphinx-build -b linkcheck ./docs/source _build/
	sphinx-build -b html ./docs/source _build/


release: clean
	python setup.py sdist --formats tar bdist_wheel
	twine upload -s dist/*

sdist: clean
	python setup.py sdist
	ls -l dist
