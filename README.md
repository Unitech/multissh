
# MultiSSH

Multi screen termcaps UI to execute a command into a list of servers.
This module will ssh into each host passed in arguments and execute the command.

NB: Make sure you have your SSH key into each host via `ssh-copy-id user@ip`


```javascript
var multissh = require('multissh');

// Execute command `ls -al` in each host
multissh.start('ls -al', [{
 ip : ip,
 hostname : hostname,
 user : user
}, {
 ip : ip,
 hostname : hostname,
 user : user
}], function(cb) {
  // Optionnal callback
});
```
