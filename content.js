var seenSidebarEmails = new WeakMap();
var sidebarForThread = new WeakMap();
var thread_users = [];
var threadView = new WeakMap();
var sidebarTemplatePromise = null;
var sidebarShowing = false;

var me = null;
var access_token = null;
var neighborhood = [];
var company = null;
var company_users = [];
var all_company_users = [];
var user_map = [];

InboxSDK.load('1', 'sdk_bonusly_cdf3f1c621').then(function(sdk) {  
	sdk.Conversations.registerMessageViewHandler(function(messageView) {
  	if(!sidebarShowing || true){
      threadView = messageView.getThreadView();
  		if (!seenSidebarEmails.has(threadView)) {
  			seenSidebarEmails.set(threadView, []);
  		}

  		var contacts = messageView.getRecipients();
  		contacts.push(messageView.getSender());
  		for (var i = 0; i < contacts.length; i++) {
  			var contact = contacts[i];
  			if (seenSidebarEmails.get(threadView).indexOf([contact.name, contact.emailAddress]) != -1) {
  				continue;
  			}
  			seenSidebarEmails.get(threadView).push([contact.name, contact.emailAddress]);
        thread_users.push(contact.emailAddress);
  		}
      
      getUserInfo().then(function(m){
        //if m is false, the user is not logged in
        if(m){
          me = m.result;
          getNeighborhoodInfo(me.id).then(function(n){
            _.each(n.result, function(neighbor){
              neighborhood.push([neighbor.username, neighbor.email])
            });
            getCompanyUsers().then(function(cu){
              all_company_users = []; //to prevent this list having duplicates when a new thread is loaded.
              _.each(cu.result, function(company_user){
                if(me.username != company_user.username){ all_company_users.push(company_user.username + ' ('+company_user.email+')')}
                if(_.indexOf(thread_users, company_user.email) >= 0){ if(me.username != company_user.username){ company_users.push('@'+company_user.username)}  }
              });
              if(all_company_users.length > 0){
                addSidebar(threadView);
              }
            });
          });
        }else{
          //user is not logged in
          addLoggedOutSidebar(threadView);
        }
      });
    }
  });

});

function addSidebar(threadview) {
  threadView = threadview;
	if (!sidebarForThread.has(threadView)) {
		sidebarForThread.set(threadView, document.createElement('div'));

		threadView.addSidebarContentPanel({
			el: sidebarForThread.get(threadView),
			title: "Bonusly - Give",
			iconUrl: chrome.runtime.getURL('images/bonusly.png')
		});
	}

  if (!sidebarTemplatePromise) {
    sidebarTemplatePromise = getTemplate(chrome.runtime.getURL('sidebarTemplate.html'));    
  }      
    Promise.all([
      get("companies/show", {}, "GET"),
      sidebarTemplatePromise
    ])
    .then(function(results) {
      company = results[0].result;
      var html = results[1];
      var template = _.template(html);
      sidebarShowing = true;
      sidebarForThread.get(threadView).innerHTML = template({
        company: company,
        me: me,
        neighborhood: neighborhood,
        company_users: company_users
      });
      $('textarea.animated').autosize();
      $('textarea#bnsly_give').atwho({at:"@", 'data': all_company_users});
      $('textarea#bnsly_give').atwho({at:"&", 'data': all_company_users});
      $('textarea#bnsly_give').atwho({at:"#", 'data': company.suggested_hashtags.map(function(h){ return h.substring(1) })});
      $('textarea#bnsly_give').atwho({at:"+", 'data': company.give_amounts});
      $('#bnsly_submit_link').click(function(){
        //gather params
        var message = encodeURIComponent($('#bnsly_give').val());
        //TODO: TR -this would be a great place to validate the params
    		$.ajax({
    			url: "https://bonus.ly/api/v1/bonuses/create_from_message?access_token="+access_token+"&message="+message,
    			type: "POST",
    			data: null,
          headers: {"Application-Name": "gmail-widget/1.0"}
    		}).done(function(resp){
    		  if(resp.success){
    		    var feedback = "<h4 class='success'>Your bonus has been given.</h4>" 
            $("div.name").remove();
            console.log('still logged in?', threadView);
            setTimeout("resetSidebar(threadView)", 2000);
    		  }else{
    		    var feedback = "<h4 class='error'>Sorry, something went wrong.</h4>"
    		  }
          $('#bnsly_feedback').html(feedback);
          
    		}).fail(function(jqXHR, status){
          //var feedback = "<h4 class='error'>"+jqXHR.responseJSON.errors.reason.human+"</h4>"
          var feedback = "<h4 class='error'>There was an error. Please make sure you have included an amount, a user, and a company value.</h4>"
          $('#bnsly_feedback').html(feedback);
    		});
      });
    });
}


function resetSidebar(threadview) {
  threadView = threadview;
  console.log('resetting', threadView);
  //addSidebar(threadView);
}

function addLoggedOutSidebar(threadview) {
  threadView = threadview;
	if (!sidebarForThread.has(threadView)) {
		sidebarForThread.set(threadView, document.createElement('div'));

		threadView.addSidebarContentPanel({
			el: sidebarForThread.get(threadView),
			title: "Bonusly - Give",
			iconUrl: chrome.runtime.getURL('images/bonusly.png')
		});
	}

  if (!sidebarTemplatePromise) {
    sidebarTemplatePromise = getTemplate(chrome.runtime.getURL('loggedOutSidebarTemplate.html'));    
  }      
    Promise.all([
      sidebarTemplatePromise
    ])
    .then(function(results) {
      sidebarShowing = true;
      var template = _.template(results[0]);
      sidebarForThread.get(threadView).innerHTML = template({});
    });
}

function getTemplate(url) {
	return Promise.resolve(
		$.ajax({
			url: url,
			type: "GET",
			data: null,
			headers: null
		})
	);
}

function get(url, params, method) {
	return Promise.resolve(
		$.ajax({
			url: "https://bonus.ly/api/v1/" + url,
			type: method,
			data: params
		}).done(function(data, textStatus, request){
      var _at = request.getResponseHeader('X-BONUSLY-Authentication-Token')
		  if(_at){ access_token = _at; }
		})
	);
}

function getNeighborhoodInfo(user_id){
    return get("users/"+me.id+"/neighborhood", {}, "GET").then(function(response){
  	  return response;
	  });
}

function getCompanyUsers(){
    return get("users", {}, "GET").then(function(response){
  	  return response;
	  });
}

function getUserInfo() {
	return get('users/me', {}, "GET").then(function(response){
  	return response;
	}, function(err) {
    return false;
  }
  );
}

