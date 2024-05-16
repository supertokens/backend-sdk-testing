#!/bin/bash

export SUPERTOKENS_ENV="testing"
export TEST_MODE="testing"

if [ "$ST_SDK" = "python" ]; then
  # Check if the mock-python.pid file exists
  if [ -f "mock-python.pid" ]; then
    # Read the process ID from the file
    pid=$(cat mock-python.pid)
    # Kill the process with the given ID
    npx tree-kill $pid
    # Remove the mock-python.pid file
    rm mock-python.pid
  fi

  # Start the uvicorn server and redirect output and errors to mock-python.log
  uvicorn api-mock.api-mock-server:app --host localhost --port 3031 > mock-python.log 2>&1 &
  # Store the process ID in the mock-python.pid file
  echo $! > mock-python.pid

elif [ "$ST_SDK" = "node" ] || [ -z "$ST_SDK" ]; then
  # Check if the mock-node.pid file exists
  if [ -f "mock-node.pid" ]; then
    # Read the process ID from the file
    pid=$(cat mock-node.pid)
    # Kill the process with the given ID
    npx tree-kill $pid
    # Remove the mock-node.pid file
    rm mock-node.pid
  fi

  # Start the tsx server and redirect output and errors to mock-node.log
  npx tsx api-mock/api-mock-server.ts > mock-node.log 2>&1 &
  # Store the process ID in the mock-node.pid file
  echo $! > mock-node.pid

else
  echo "Invalid value for ST_SDK environment variable"
fi




## if process.env.ST_SDK === python it will run "uvicorn api-mock.api-mock-server:app --host 0.0.0.0 --port 3031" 
## and it will create a temp file with the pid of the process called mock-python.pid
## before start the server, it will check if the file mock-python.pid exists and if it does it will kill the process with the pid in the file and remove the file
## log both output and errors to a file called mock-python.log

## if process.env.ST_SDK === node  or empty it will run "npx tsx api-mock/api-mock-server.ts"
## and it will create a temp file with the pid of the process called mock-node.pid
## before start the server, it will check if the file mock-node.pid exists and if it does it will kill the process with the pid in the file and remove the file
## log both output and errors to a file called mock-node.log