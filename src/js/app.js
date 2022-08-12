App = {
  web3Provider: null,
  contracts: {},
  bidderEmails : [],
  highestBids : [],
  isSettled : [],
  isFinished : [],

  getData: async function() {
    //load datas.
    await axios.get('http://localhost:3000/get-datas').then(resp => {
      App.bidderEmails = resp.data.bidderEmails;
      App.highestBids = resp.data.highestBids;
      App.isSettled = resp.data.isSettled;
      App.isFinished = resp.data.isFinished;
    });

    return await App.init();
  },

  init: async function() {
    // Load items.
    $.getJSON('../items.json', function(data) {
      var itemsRow = $('#items-row');
      var itemTemplate = $('#item-template');
      for (i = 0; i < data.length; i ++) {
        itemTemplate.find('.panel-title').text(data[i].name);
        itemTemplate.find('img').attr('src', data[i].picture);
        itemTemplate.find('.btn-sell').attr('data-id', data[i].id);
        itemTemplate.find('.btn-pay').attr('data-id', data[i].id);
        itemTemplate.find('.btn-bid').attr('data-id', data[i].id);
        itemTemplate.find('.bid').attr('data-id', data[i].id);
        itemTemplate.find('.item-hash').text(data[i].itemHash);
        $(".max-bid")[i].innerHTML = App.highestBids[i]; 

        if(App.isSettled[i]){
          itemTemplate.find('.btn-sell').attr('style', "display:none;");
          itemTemplate.find('.bid').attr('style', "display:none;");
          itemTemplate.find('.btn-pay').attr('style', "display:inline;");
          itemTemplate.find('.sold-status').attr('style', "display:block;");

          if(App.isFinished[i]){
            $(".sold-status")[i].innerHTML = "auction completed.";
            itemTemplate.find('.btn-pay').attr('style', "display:none;");
            itemTemplate.find('.btn-bid').attr('style', "display:none;");
            $('.winner-email')[i].innerHTML = "Winnder email : " + App.bidderEmails[i];
          }
        }else {
          itemTemplate.find('.btn-sell').attr('style', "display:inline;");
          itemTemplate.find('.btn-pay').attr('style', "display:none;"); 
          itemTemplate.find('.btn-bid').attr('style', "display:inline;");
          itemTemplate.find('.sold-status').attr('style', "display:none;");
          itemTemplate.find('.bid').attr('style', "display:block;");
          $('.winner-email')[i].innerHTML = "";
        }
        itemsRow.append(itemTemplate.html());
      }
    });

    return await App.initWeb3();
  },

  initWeb3: async function() {
    //Modern dApp browsers like firefox, chrome, brave have window.ethereum object for provider.
    if (window.ethereum) {
      App.web3Provider = window.ethereum;
      try {
        await window.ethereum.request({ method: "eth_requestAccounts" });
      } 
      catch (error) {
        console.error("User denied account access");
      }
    }
    // This is for legacy dapp browsers, if modern dapp browser is not being used.
    else if(window.web3) {
      App.web3Provider = window.web3.currentProvider;
    }

    web3 = new Web3(App.web3Provider);

    return App.initContract();
  },

  initContract: function() {
    $.getJSON('Auction.json', function(data) {
      // Get the necessary contract artifact file and instantiate it with @truffle/contract
      var AuctionArtifact = data;
      App.contracts.Auction = TruffleContract(AuctionArtifact);
    
      // Set the provider for our contract
      App.contracts.Auction.setProvider(App.web3Provider);
    
    });
    return App.bindEvents();
  },

  bindEvents: function() {
    $(document).on('click', '.btn-pay', App.handlePay);
    $(document).on('click', '.btn-sell', App.handleSell);
    $(document).on('click', '.btn-bid', App.handleBid);
    $(document).on('keyup', '.bid', App.handleButton);
  },

  handlePay: function(event) {
    event.preventDefault();

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
    
      var account = accounts[0]; 
    
      App.contracts.Auction.deployed().then(function(instance) {
        auctionInstance = instance;
    
        bidID = parseInt($(event.target).data('id'));
        itemHash = $(".item-hash")[bidID].innerHTML;
        amount = parseInt($(".max-bid")[bidID].innerHTML);
       
        return auctionInstance.payForItem(itemHash, {from: account, value:amount});
      }).then(function(isTrue) { 
        if(isTrue){
          $(".sold-status")[bidID].innerHTML = "auction completed.";
          $(".btn-pay")[bidID].setAttribute("style","display:none;");
          $(".btn-bid")[bidID].setAttribute("style","display:none;");

          App.isFinished[bidID] = true;

          axios.post('http://localhost:3000/update-pay',{
            isFinished: App.isFinished
          });

          return;
        }
      }).catch(function(err) {
        alert("you are not the owner of this item");
      });
    });
  },

  handleSell: function(event) {
    event.preventDefault();

    web3.eth.getAccounts(function(error, accounts) {
      if (error) {
        console.log(error);
      }
      var account = accounts[0]; 
    
      App.contracts.Auction.deployed().then(function(instance) {
        auctionInstance = instance;
        bidID = parseInt($(event.target).data('id'));
        itemHash = $(".item-hash")[bidID].innerHTML;
        return auctionInstance.completeAuction(itemHash,{from: account});
      }).then(function(isTrue) {
        if(isTrue){
          $(".btn-sell")[bidID].setAttribute("style","display:none;");
          $(".btn-pay")[bidID].setAttribute("style","display:inline;");
          $(".sold-status")[bidID].setAttribute("style","display:block;");
          $(".winner-email")[bidID].innerHTML = "Winnder email : " + App.bidderEmails[bidID];

          App.isSettled[bidID] = true;

          axios.post('http://localhost:3000/update-sell',{
            isSettled: App.isSettled
          });

          return;
        }
      }).catch(function(err) {
        alert("you are not the owner of this item");
      });
    });
  },

  handleBid: function(event) {
    event.preventDefault();

    bidID = parseInt($(event.target).data('id'));
    App.bidderEmails[bidID] = $(".email")[bidID].value;
    App.highestBids[bidID] = parseInt($(".bid")[bidID].value);
    $(".max-bid")[bidID].innerHTML = App.highestBids[bidID];

    axios.post('http://localhost:3000/update-datas',{
      bidderEmails: App.bidderEmails,
      highestBids: App.highestBids
    
    })
    .then(function (response) {
      console.log(response);
    })
    .catch(function (error) {
      console.log(error);
    });
  },

  handleButton: function(event) {
    event.preventDefault();

    bidID = parseInt($(event.target).data('id'));
    if(parseInt($(".bid")[bidID].value) > App.highestBids[bidID]){
      $(".btn-bid")[bidID].disabled = false;
      $(".bidder-email")[bidID].setAttribute("style","display:block;");
    }
    else{
      $(".btn-bid")[bidID].disabled = true;
      $(".bidder-email")[bidID].setAttribute("style","display:none;");
    }
    return;
  }
};

$(function() {
  $(window).load(function() {
    App.getData();
  });
});
