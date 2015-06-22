#!/bin/bash

# adds/updates awesome-query alias in ~/.bash_aliases if installed globally

globalPath=$(npm config get prefix)
globalPath="$globalRoute/bin/node_modules"

currentPath=$(cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd)
runCommand="node $currentPath/src/bin/run.js"

if [[ $currentPath == $globalPath* ]] && [[ -w ~/.bash_aliases ]]; then
  if grep --quiet "alias awesome-query=" ~/.bash_aliases; then
    sed -i "s@^.*alias awesome-query=.*\$@alias awesome-query=\"$runCommand\"@" ~/.bash_aliases
  else
    printf "\nalias awesome-query=\"$runCommand\"" >> ~/.bash_aliases
  fi
fi
