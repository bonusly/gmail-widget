InboxSDK.load(1, 'sdk_bonusly_cdf3f1c621').then(function(sdk) {

	sdk.Conversations.registerMessageViewHandler(function(messageView){

	var el = document.createElement("div");
  el.cssText = el.style.cssText = "padding:8px; color:#444;position:relative;margin-top:-30px;border-left:1px solid #d7d7d7;border-right:1px solid #d7d7d7;"
	//el.innerHTML += threadView.getThreadID();
  var rec = []
  //threadView.getMessageViewsAll().forEach(function(mv){
    messageView.getRecipients().forEach(function(r){
      if(!_.contains(rec, r.emailAddress)){
        console.log(r)
        rec.push(r.emailAddress);
      }
    });
    //});
  rec = rec.sort();
  selectString = '<select id="user_emails">';
  selectString += '<option value="-1">Recipients</option>'
  for(i=0;i<rec.length;i++){
    selectString += '<option value="'+rec[i]+'">'+rec[i]+'</option>'
  }
  selectString += '</select>';
  el.innerHTML += selectString
  
		messageView.addSidebarContentPanel({
      titleEl: '<h2>Bonusly</h2>',
			el: el
		});

	});

});
