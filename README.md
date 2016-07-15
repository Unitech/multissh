
# MultiSSH

Multi screen termcaps UI to execute a command into a list of servers.
This module will ssh into each host passed in arguments and execute the command.

![asciicast](asciicast.gif)

**NB: Make sure you have your SSH pub key into each host via `$ ssh-copy-id user@ip`**

```javascript
var multissh = require('multissh');

// Execute command `ls -al` in each host
multissh.start({
 cmd : 'ls -al',
 title : 'Doing a file listing',
 server_list : [{
    ip   : ip,
    user : user,
    key  : 'rsa_pub.key', // Optional key
    local: true // Exec command via exec instead of ssh
  },{
    ip : ip,
    user : user
  }],
 }, function(cb) {
  // Optionnal callback
});
```

# Misc commands

IP : `hostname -I | cut -d " " -f1`
Remove interactive checks: "grep "case \$-" .bashrc && sed -i '5,9d' .bashrc"
