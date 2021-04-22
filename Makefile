install:
	npm install

ci:
	npm ci

lint:
	npx eslint .

publish:
	npm publish --dry-run

start:
	npx webpack serve

build:
	npm run build

test:
	npm test -s

test-coverage:
	npm test -- --coverage --coverageProvider=v8
