var cachedCompanyPromises = {};

var seenSidebarEmails = new WeakMap();
var sidebarForThread = new WeakMap();

var bnslyInfoPromise = null;
var neighborhoodPromise = null;
var userPromise = null;
var companyPromise = null;

var sidebarTemplatePromise = null;

var sidebarShowing = false;

var me = null;

InboxSDK.load('1', 'sdk_bonusly_cdf3f1c621').then(function(sdk) {  
  
	sdk.Conversations.registerMessageViewHandler(function(messageView) {
  	if(!sidebarShowing){
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
  		}
    
      getUserInfo().then(function(m){ me = m.result; addSidebar(threadView) });
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
    console.log(me)
  
    Promise.all([
      get("companies/show", {}, "GET"),
      get("users/"+me.id+"/neighborhood", {}, "GET"),
      sidebarTemplatePromise
    ])
    .then(function(results) {
      var company = results[0].result;
      var neighborhood = results[1].result;
      var html = results[2];
      var template = _.template(html);
      sidebarShowing = true;
      console.log(neighborhood);  
      sidebarForThread.get(threadView).innerHTML = sidebarForThread.get(threadView).innerHTML + template({
        company: company,
        me: me,
        neighborhood: neighborhood,
        contacts: seenSidebarEmails.get(threadView)
      });
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
		})
	);
}

function bnslyGet(url, params, method) {
	return bnslyInfoPromise.then(function(info) {
		return get(url, params, method);
	});
}

function get_neighborhood_info(params,user_id){
	return neighborhoodPromise.then(function(info) {
    var url = "users/"+user_id+"/neighborhood";
    var method = "GET";
    
		return get(url, params, method);
	});
}

function get_company_info(params){
	return companyPromise.then(function(info) {
    var url = "companies/show";
    var method = "GET";
    
		return get(url, params, method);
	});
}


function getUserInfo() {
	return get('users/me', {}, "GET").then(function(response){
  	return response;
	});
}