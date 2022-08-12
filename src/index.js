const express = require("express");
const app = express();
var cors = require('cors');
var Web3 = require("web3");
const bodyParser = require('body-parser');
app.use(cors())
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended:false}));
var Web3 = require("web3");
var web3 = new Web3(new Web3.providers.HttpProvider("http://localhost:7545"));
var contract;

var bidderEmails = ["","",""];
var highestBids = [0,0,0];
var isSettled = [false,false,false]
var isFinished = [false,false,false];

app.post("/create-contract", (req, res) => {
    contract = new web3.eth.Contract(req.body.abi, req.body.contractAddress);
    res.send("contract created successfully");
});

app.post("/push-item", (req, res) => {
    contract.methods.pushItem(req.body.auctionerAddres, req.body.itemhash).send({from:req.body.contractOwner});
    res.send("item and its auctioneer added successfully");
});


app.get("/get-datas", (req, res) => {
    res.send({
        bidderEmails : bidderEmails,
        highestBids : highestBids,
        isSettled : isSettled,
        isFinished : isFinished
    }); 
    
});

app.post("/update-datas", (req, res) => {
    bidderEmails = req.body.bidderEmails;
    highestBids = req.body.highestBids;
    res.send("it's ok");
});

 app.post("/update-sell", (req, res) => {
    isSettled = req.body.isSettled;
    res.send("it's ok");
});

app.post("/update-pay", (req, res) => {
    isFinished = req.body.isFinished;
    res.send("it's ok");
});

app.listen(3000, () => {
  console.log("Application started and Listening on port 3000");
});

