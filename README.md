# backend-sdk-testing

Common test suit for all backend SDKs

# node

requirements:

-   node 16

```bash
npm install
INSTALL_PATH=../supertokens-root npm test
```

# python

```bash
python3 -m venv pyenv
source pyenv/bin/activate
pip install -r requirements.txt
ST_SDK=python INSTALL_PATH=../supertokens-root npm test
```

# golang

pending

# TODO

-   [ ] check for FIXME on api-mock folder
-   [ ] not sure why python didn't worked with my default docker startup, meanwhile node did
-   [ ] how to handle mock-server shutdown when tests fail
-   [ ] mocha .only isn't working when not specifying the test file
-   [ ] move api-mock-server to their own project
