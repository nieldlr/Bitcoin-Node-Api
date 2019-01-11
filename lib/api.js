var bitcoin = require('bitcoin-core');
var express = require('express');

module.exports = function(){

  function express_app(){
    var app = express();
    
    app.get('*', hasAccess, function(req, res){
      var method = req.path.substring(1,req.path.length);

      if('undefined' != typeof requires_passphrase[method]){
        if(wallet_passphrase) client.walletPassphrase(wallet_passphrase, 10);
        else res.send('A wallet passphrase is needed and has not been set.');
      }

      var query_parameters = req.query;
      var params = [];

      for(var parameter in query_parameters){
        if(query_parameters.hasOwnProperty(parameter)){
          var param = query_parameters[parameter];
          if(!isNaN(param)){
            param = parseFloat(param);
          }
          params.push(param);
        }
      }

      var command = [];
      if(method == "sendmany"){
        command = specialApiCase('sendmany');
      }
      else if(method == "verifymessage"){
        command = specialApiCase('verifymessage', query_parameters);
      }else{
        command = [{
          method: method,
          parameters: params
        }];
      }

      client.command(command, function(err, response){
        if(err){console.log(err); res.send("There was an error. Check your console.");}
        else{
          if(typeof response === 'object'){
            res.json(response[0]);
          }
          else{
            res.send(""+response[0]);
          }
        }
      });
      
    });
    
    function hasAccess(req, res, next){
      if(accesslist.type == 'all'){
        return next();
      }

      var method = req.path.substring(1,req.path.length);
      if('undefined' == typeof accesslist[method]){
        if(accesslist.type == 'only') res.end('This method is restricted.');
        else return next();
      }
      else{
        if(accesslist[method] == true){
          return next();
        }
        else res.end('This method is restricted.');
      } 
    }

    function specialApiCase(method_name, query_parameters){
      var params = [];
      if(method_name == 'sendmany'){
        var after_account = false;
        var before_min_conf = true;
        var address_info = {};
        for(var parameter in query_parameters){
          if(query_parameters.hasOwnProperty(parameter)){
            if(parameter == 'minconf'){
              before_min_conf = false;
              params.push(address_info);
            }
            var param = query_parameters[parameter];
            if(!isNaN(param)){
              param = parseFloat(param);
            }
            if(after_account && before_min_conf){
              address_info[parameter] = param;
            }
            else{
              params.push(param);
            }
            if(parameter == 'account') after_account = true;           
          }
        }
        if(before_min_conf){
          params.push(address_info);
        }
      }else if(method_name == 'verifymessage'){
        for(var parameter in query_parameters){
          if(query_parameters.hasOwnProperty(parameter)){
            if(parameter == 'address' || parameter == 'message'){
              params.push(query_parameters[parameter]);
            }
            if(parameter == 'signature'){
              var param = decodeURIComponent(query_parameters[parameter]);
              while (param.indexOf(" ") > -1) {
                   param = param.replace(" ", "+");
              }     
              params.push(param);
            }
          }
        }
      }

      return [{
        method: method_name,
        parameters: params
      }];
    }

    return app;
  };

  var accesslist = {};
  accesslist.type = 'all';
  var client = {};
  var wallet_passphrase = null;
  var requires_passphrase = {
    'dumpprivkey': true,
    'importprivkey': true,
    'keypoolrefill': true,
    'sendfrom': true,
    'sendmany': true,
    'sendtoaddress': true,
    'signmessage': true,
    'signrawtransaction': true
  };

  function setAccess(type, access_list){
    //Reset//
    accesslist = {};
    accesslist.type = type;

    if(type == "only"){
      var i=0;
      for(; i<access_list.length; i++){
        accesslist[access_list[i]] = true;
      }
    }

    if(type == "restrict"){
      var i=0;
      for(; i<access_list.length; i++){
        accesslist[access_list[i]] = false;
      }
    }

    //Default is for security reasons. Prevents accidental theft of coins/attack

    if(type == 'default-safe'){
      accesslist.type = 'restrict';
      var restrict_list = ['dumpprivkey', 'walletpassphrasechange', 'stop'];
      var i=0;
      for(;i<restrict_list.length;i++){
        accesslist[restrict_list[i]] = false;
      }
    }

    if(type == 'read-only'){
      accesslist.type = 'restrict';
      var restrict_list = ['addmultisigaddress', 'addnode', 'backupwallet', 'createmultisig', 'createrawtransaction', 'encryptwallet', 'importprivkey', 'keypoolrefill', 'lockunspent', 'move', 'sendfrom', 'sendmany', 'sendrawtransaction', 'sendtoaddress', 'setaccount', 'setgenerate', 'settxfee', 'signmessage', 'signrawtransaction', 'stop', 'submitblock', 'walletlock', 'walletpassphrasechange'];
      var i=0;
      for(;i<restrict_list.length;i++){
        accesslist[restrict_list[i]] = false;
      }
    }
  };

  function setWalletDetails(details){
    if('undefined' == typeof details.rpc){
      client = new bitcoin(details);
    }
    else{
      client = details;
    }
  };

  function setWalletPassphrase(passphrase){
    wallet_passphrase = passphrase;
  };

  return {
    app: express_app(),
    setAccess: setAccess,
    setWalletDetails: setWalletDetails,
    setWalletPassphrase: setWalletPassphrase
  }
}();