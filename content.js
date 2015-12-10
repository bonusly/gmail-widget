var seenSidebarEmails = new WeakMap();
var sidebarForThread = new WeakMap();
var thread_users = [];

var sidebarTemplatePromise = null;
var sidebarShowing = false;

var me = null;
var access_token = null;
var neighborhood = [];
var company_users = [];

var user_map = [];

InboxSDK.load('1', 'sdk_bonusly_cdf3f1c621').then(function(sdk) {  
  
	sdk.Conversations.registerMessageViewHandler(function(messageView) {
  	if(!sidebarShowing || true){
      var threadView = messageView.getThreadView();
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
              _.each(cu.result, function(company_user){
                if(_.indexOf(thread_users, company_user.email) >= 0){ if(me.username != company_user.username){ company_users.push('@'+company_user.username)}  }
              });
              addSidebar(threadView);
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

function addSidebar(threadView) {
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
      var company = results[0].result;
      var html = results[1];
      var template = _.template(html);
      sidebarShowing = true;
      sidebarForThread.get(threadView).innerHTML = template({
        company: company,
        me: me,
        neighborhood: neighborhood,
        company_users: company_users
      });
      $('#bnsly_submit_link').click(function(){
        //gather params
        var message = encodeURIComponent($('#bnsly_give').val());
        //TODO: TR -this would be a great place to validate the params
    		$.ajax({
    			url: "https://bonus.ly/api/v1/bonuses/create_from_message?access_token="+access_token+"&message="+message,
    			type: "POST",
    			data: null
    		}).done(function(resp){
    		  if(resp.success){
    		    var feedback = "<h4 class='success'>Your reward has been granted.</h4>"
    		  }else{
    		    var feedback = "<h4 class='error'>Sorry, something went wrong.</h4>"
    		  }
          $('#bnsly_give').parent().prepend(feedback);
    		});
      });
    });
}

function addLoggedOutSidebar(threadView) {
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

