
var multissh = require('..');

describe('Multissh non interactive mode', function() {
  this.timeout(15000);

  it('should run cmd', function(done) {
    multissh.start({
      cmd : 'ls -l',
      server_list : [{
        ip : '127.0.0.1',
        user : process.env.USER,
        local : true
      }],
      non_interactive_mode : true
    }, function() {
      done();
    });
  });

  it('should run cmd', function(done) {
    multissh.start({
      cmd : 'ls -l',
      auto_exit : true,
      server_list : [{
        ip : '127.0.0.1',
        user : process.env.USER,
        local : true
      }]
    }, function() {
      done();
    });
  });
});
