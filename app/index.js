const request = require('superagent'); 
const colors = require('colors');
const repl = require('repl');
const fs = require('fs');
const csv = require('csv');
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
       	//console.log('yay got ' + JSON.stringify(res.body));
		var currencyList = res.body;
		listExchangeRates(currencyList);
     }
   });
};

var listExchangeRates =function (currencyList) {  
  request
   .get('https://api.coinbase.com/v1/currencies/exchange_rates')
   .end(function(err, res){
     if (err || !res.ok) {
		 console.log('Oh no! error');
     } else {
		 //console.log('yay got ' + JSON.stringify(res.body));
		 var exchangeRatesList = res.body;
		 userPrompt(currencyList,exchangeRatesList);
     }
   });
};

var csv2console = function(csvfile, callback) {
   var parser = csv.parse(); //create the parser
	var outrow = "";
    parser.on('readable',function(){
    while(row = parser.read()) {
        var timestamp = row[0];
        var order = row[1];
        var type = row[2];
        outrow = outrow+timestamp+" : "+order+" : "+type+"\n";
     }
    });
	parser.on('end', function(){
		callback(outrow);
	});
   parser.on('error', function(err){
     console.log(err.message);
   });
	fs.createReadStream(csvfile).pipe(parser);//Open file as stream and pipe it to parser
};


var buildfn = function(csvfile, orders, callback) {
	//console.log(orders);
	//fs.writeFileSync(csvfile, '"Wed Oct 05 2016 22:09:40 GMT+0000 (UTC)","BUY 10","UNFILLED"\n"Mon Oct 05 2016 22:09:40 GMT+0000 (UTC)","SELL 25","UNFILLED"');
	fs.writeFileSync(csvfile, orders);
    csv2console(csvfile, callback);
};

var orders = function(csvfile, callback) {
    csvfile = csvfile || CSVFILE_DEFAULT;
	orders = ORDERS;
	buildfn(csvfile,orders,callback);
};


var buy = function(currencyList,exchangeRatesList,arg1,arg2,callback) {
	if(arg2 != null || arg2 != undefined){
		if(!_.contains(_.flatten(currencyList),arg2.toUpperCase())){
		callback("No known exchange rate for BTC/"+arg2.toUpperCase()+". Order failed");
		return;
		}else{
			var exchangeRate = _.propertyOf(exchangeRatesList)("btc_to_"+arg2);
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
};


var sell = function(currencyList,exchangeRatesList,arg1,arg2,callback) {
	if(arg2 != null || arg2 != undefined){
		if(!_.contains(_.flatten(currencyList),arg2.toUpperCase())){
		callback("No known exchange rate for BTC/"+arg2.toUpperCase()+". Order failed");
		return;
		}else{
			var exchangeRate = _.propertyOf(exchangeRatesList)("btc_to_"+arg2);
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
};


var userInputController = function(cmd,currencyList,exchangeRatesList,cb){
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
			buy(currencyList,exchangeRatesList,cmdArr[1],cmdArr[2],function(res){	
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
			sell(currencyList,exchangeRatesList,cmdArr[1],cmdArr[2],function(res){
				cb(res);
			});	
			break;
		case "ORDERS":
			orders(null,function(res){				
				var exchangeRate = _.propertyOf(exchangeRatesList)("btc_to_usd");
				console.log("current BTC/USD: "+exchangeRate);
				console.log(" === CURRENT ORDERS ===");	
				cb(res);
			});			
			break;
		default:
			cb( "Not supported Command. Please Try Again");
			
	}
}
var userPrompt = function (currencyList,exchangeRatesList) {
	//console.log(JSON.stringify(currencyList));
	//console.log(JSON.stringify(exchangeRatesList));
	console.log("Welcome to Bitcoin Exchange.".bold);
	console.log("Command-Line console for exchanging Bitcoins\n");	
	console.log("	 Syntax: BUY <amount> [currency]");
	console.log("	Example: BUY 10\n");
	console.log("If a currency is provided (USD, EUR, etc.), the order will buy as many BTC as the <amount> provides at the current exchange rates.\n");
	
	repl.start({
    prompt: 'coinbase> ',
    eval: function (cmd, context, filename, callback) {		
		userInputController(cmd,currencyList,exchangeRatesList,function(data){
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


