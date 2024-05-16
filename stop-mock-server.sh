## this script will look for the mock-server pid file mock-python.pid or mock-node.pid 
## and kill the process with the pid in the file and remove the file

if [ -f "mock-python.pid" ]; then
  pid=$(cat mock-python.pid)
  npx tree-kill $pid 
  rm mock-python.pid
fi

if [ -f "mock-node.pid" ]; then
  pid=$(cat mock-node.pid)
  npx tree-kill $pid
  rm mock-node.pid
fi
