const request = require('superagent'); 
const colors = require('colors');
const repl = require('repl');
const fs = require('fs');
const csv = require('fast-csv');
const _ = require('underscore');

var HEADERS_DEFAULT = ["Timestamp", "Order", "Detail"];
var CSVFILE_DEFAULT = "coinbase.csv";
var ORDERS = "";

var listCurrencies =function () {  
  request
   .get('https://api.coinbase.com/v1/currencies')
   .end(function(err, res){
     if (err || !res.ok) {
       	console.log('Oh no! error');
     } else {
		var currencyList = res.body;
		userPrompt(currencyList);
     }
   });
};

var listExchangeRates =function (callback) {  
  request
   .get('https://api.coinbase.com/v1/currencies/exchange_rates')
   .end(function(err, res){
     if (err || !res.ok) {
		 console.log('Oh no! error');
     } else {
		 var exchangeRatesList = res.body;
		 var exchangeRate = _.propertyOf(exchangeRatesList)("btc_to_usd");
		 callback(exchangeRatesList);
     }
   });
};

var csv2console = function(csvfile, callback) {
	listExchangeRates(function(exchangeRatesList){
		var exchangeRate = _.propertyOf(exchangeRatesList)("btc_to_usd");
		console.log("current BTC/USD: "+exchangeRate);
		console.log(" === CURRENT ORDERS ===");	
		var outrow = "";
		
		var stream = fs.createReadStream(csvfile);

		csv
		 .fromStream(stream)
		 .on("data", function(data){
			 outrow += data[0]+" : "+data[1]+" : "+data[2]+"\n";
		 })
		 .on("end", function(){
			 callback(outrow);
		 });
	});
};


var buildfn = function(csvfile, orderCmd, callback) {
	fs.writeFileSync(csvfile, orderCmd);
    csv2console(csvfile, callback);
};

var orders = function(callback) {
    csvfile = CSVFILE_DEFAULT;
	orderCmd = ORDERS;
	buildfn(csvfile,orderCmd,callback);
};


var buy = function(currencyList,arg1,arg2,callback) {
	listExchangeRates(function(exchangeRatesList){
			
		if(arg2 != null || arg2 != undefined){
			if(!_.contains(_.flatten(currencyList),arg2.toUpperCase())){
			callback("No known exchange rate for BTC/"+arg2.toUpperCase()+". Order failed");
			return;
			}else{
				var exchangeRate = _.propertyOf(exchangeRatesList)("btc_to_"+arg2.toLowerCase());
				var count = arg1 / exchangeRate;

				result = "Order to BUY "+arg1+" "+arg2.toUpperCase()+" worth of BTC queued @ "+exchangeRate+" BTC/USD ("+count+" BTC)";
			} 
		}else{
			result = "Order to BUY "+arg1+" BTC queued" ;
		}	

		var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		var dayNames = ["Sun","Mon","Tues","Wed","Thu","Fri","Sat"];
		var today = new Date(); 

		var datetime = dayNames[today.getUTCDay()]+" "+monthNames[today.getUTCMonth()]+ " " + today.getUTCDate()+" "+today.getFullYear()+" "+today.getUTCHours()+":"+today.getUTCMinutes()+":"+today.getUTCSeconds()+" GMT+0000 (UTC)";

		var order = "BUY "+arg1;
		if (arg2!= undefined){
			order = order+arg2.toUpperCase();
		}else{
			order = order+"BTC";
		}
		var type = "UNFILLED";
		ORDERS = ORDERS + '"'+datetime+'",'+'"'+order+'",'+'"'+type+'"\n';
		callback(result);
	});
};


var sell = function(currencyList,arg1,arg2,callback) {
	listExchangeRates(function(exchangeRatesList){
		if(arg2 != null || arg2 != undefined){
			if(!_.contains(_.flatten(currencyList),arg2.toUpperCase())){
			callback("No known exchange rate for BTC/"+arg2.toUpperCase()+". Order failed");
			return;
			}else{
				var exchangeRate = _.propertyOf(exchangeRatesList)("btc_to_"+arg2.toLowerCase());
				var count = arg1 / exchangeRate;

				result = "Order to SELL "+arg1+" "+arg2.toUpperCase()+" worth of BTC queued @ "+exchangeRate+" BTC/USD ("+count+" BTC)";
			} 
		}else{
			result = "Order to SELL "+arg1+" BTC queued" ;
		}	

		var monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "June","Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
		var dayNames = ["Sun","Mon","Tues","Wed","Thu","Fri","Sat"];
		var today = new Date(); 

		var datetime = dayNames[today.getUTCDay()]+" "+monthNames[today.getUTCMonth()]+ " " + today.getUTCDate()+" "+today.getFullYear()+" "+today.getUTCHours()+":"+today.getUTCMinutes()+":"+today.getUTCSeconds()+" GMT+0000 (UTC)";

		var order = "SELL "+arg1;
		if (arg2!= undefined){
			order = order+arg2.toUpperCase();
		}else{
			order = order+"BTC";
		}
		var type = "UNFILLED";
		ORDERS = ORDERS + '"'+datetime+'",'+'"'+order+'",'+'"'+type+'"\n';
		callback(result);
	});
};


var userInputController = function(cmd,currencyList,cb){
	var cmdArr = cmd.replace(/(\r\n|\n|\r)/gm,"").split(" ");

	switch(cmdArr[0].toUpperCase()) {
		case "BUY":
			if (cmdArr[1] === null || cmdArr[1] === undefined){
				cb("No amount specified");
				break;
			}
			function isNumeric(value) {
				return /^\d+$/.test(value);
			}
			if (!isNumeric(cmdArr[1])){
				cb("Not valid amount value");
				break;
			}
			buy(currencyList,cmdArr[1],cmdArr[2],function(res){	
				cb(res);
			});	
			break;
		case "SELL":		
			if (cmdArr[1] === null || cmdArr[1] === undefined){
				cb("No amount specified");
				break;
			}
			function isNumeric(value) {
				return /^\d+$/.test(value);
			}
			if (!isNumeric(cmdArr[1])){
				cb("Not valid amount value");
				break;
			}
			sell(currencyList,cmdArr[1],cmdArr[2],function(res){
				cb(res);
			});	
			break;
		case "ORDERS":
			orders(function(res){
				cb(res);
			});				
			break;
		default:
			cb( "Not supported Command. Please Try Again");
			
	}
}
var userPrompt = function (currencyList) {
	console.log("Welcome to Bitcoin Exchange.".bold);
	console.log("Command-Line console for exchanging Bitcoins\n");	
	console.log("	 Syntax: BUY <amount> [currency]");
	console.log("	Example: BUY 10\n");
	console.log("If a currency is provided (USD, EUR, etc.), the order will buy as many BTC as the <amount> provides at the current exchange rates.\n");
	
	repl.start({
    prompt: 'coinbase> ',
    eval: function (cmd, context, filename, callback) {		
		userInputController(cmd,currencyList,function(data){
			callback(null,data); 
		});
    },
    writer: function (data) {
        // echo out data to the console here
		return data;
    }
});
};

listCurrencies();


