# Contributing

We're so excited you're interested in helping with SuperTokens! We are happy to help you get started, even if you don't have any previous open-source experience :blush:

## New to Open Source?

1. Take a look at [How to Contribute to an Open Source Project on GitHub](https://egghead.io/courses/how-to-contribute-to-an-open-source-project-on-github)
2. Go through the [SuperTokens Code of Conduct](https://github.com/supertokens/backend-sdk-testing/blob/master/CODE_OF_CONDUCT.md)

## Where to ask Questions?

1. Check our [Github Issues](https://github.com/supertokens/backend-sdk-testing/issues) to see if someone has already answered your question.
2. Join our community on [Discord](https://supertokens.com/discord) and feel free to ask us your questions

## Development Setup

You will need to setup the `supertokens-core` in order to to run the `backend-sdk-testing` tests, you can setup `supertokens-core` by following this [guide](https://github.com/supertokens/supertokens-core/blob/master/CONTRIBUTING.md#development-setup)  
**Note: If you are not contributing to the `supertokens-core` you can skip steps 1 & 4 under Project Setup of the `supertokens-core` contributing guide.**

You will need to fork/clone the `supertokens-node` and `supertokens-python`.

```bash
git clone https://github.com/supertokens/supertokens-node.git
git clone https://github.com/supertokens/supertokens-python.git
```

### Prerequisites

-   OS: Linux or macOS
-   Nodejs 16 & npm
-   Python 3 & pip
-   Golang
-   IDE: [VSCode](https://code.visualstudio.com/download)(recommended) or equivalent IDE

### Project Setup

1. Fork the [backend-sdk-testing](https://github.com/supertokens/backend-sdk-testing) repository
2. Clone the forked repository in the parent directory of the previously setup `supertokens-root`, `supertokens-node` and `supertokens-python`.  
   `backend-sdk-testing`, `supertokens-root`, `supertokens-node` and `supertokens-python` should exist side by side within the same parent directory
3. `cd backend-sdk-testing`

##### Node

4. Install the project dependencies  
   `npm i -d && npm run set-up-hooks`
5. Build packages
   `npm run build-pretty`

## Modifying Code

1. Open the `backend-sdk-testing` project in your IDE and you can start modifying the code
2. After modifying the code, build your project to implement your changes  
   `npm run build-pretty`

## Node Testing

1. Navigate to the `supertokens-root` repository
2. Start the testing environment  
   `./startTestEnv --wait`
3. Navigate to the `supertokens-node` repository
4. Start the API test server, and keep it running
   `cd test/test-server && npm i && npm run start`
5. In another terminal run all tests against node-sdk (run the following in the backend-sdk-testing repository)
   `INSTALL_PATH=../supertokens-root npm test`

## Python Testing
1. Navigate to the `supertokens-root` repository
2. Start the testing environment  
   `./startTestEnv --wait`
3. Navigate to the `supertokens-python` repository
4. Start the API test server, and keep it running
   `cd tests/test-server && SUPERTOKENS_ENV=testing API_PORT=3030 ST_CONNECTION_URI=http://localhost:8081 python3 app.py`
5. In another terminal run all tests against python-sdk (run the following in the backend-sdk-testing repository)
   `INSTALL_PATH=../supertokens-root npm test`

## Golang Testing
TODO

## Pull Request

1. Before submitting a pull request make sure all tests have passed
2. Reference the relevant issue or pull request and give a clear description of changes/features added when submitting a pull request
3. Make sure the PR title follows [conventional commits](https://www.conventionalcommits.org/en/v1.0.0/) specification

## SuperTokens Community

SuperTokens is made possible by a passionate team and a strong community of developers. If you have any questions or would like to get more involved in the SuperTokens community you can check out:

-   [Github Issues](https://github.com/supertokens/backend-sdk-testing/issues)
-   [Discord](https://supertokens.com/discord)
-   [Twitter](https://twitter.com/supertokensio)
-   or [email us](mailto:team@supertokens.com)

Additional resources you might find useful:

-   [SuperTokens Docs](https://supertokens.com/docs/community/getting-started/installation)
-   [Blog Posts](https://supertokens.com/blog/)
