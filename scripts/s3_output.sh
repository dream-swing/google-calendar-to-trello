cp -R node_modules/ build/node_modules
pushd build
zip -r ../out/google-calendar-to-trello.zip ./*
popd
rm -R build/node_modules/