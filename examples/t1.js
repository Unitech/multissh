
var multissh = require('..');

multissh.start('ls -al', [{
  ip : '127.0.0.1',
  user : process.env.USER,
  hostname : 'My computer'
}]);
