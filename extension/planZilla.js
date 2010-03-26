Function.prototype.using=Function.call;Object.spawn=function(e,a){var d=function(){},c={},b={};d.prototype=e;c=new d();for(b in a){c[b]=a[b]}return c};Object.size=function(c){var b=0,a;for(a in c){if(c.hasOwnProperty(a)){b++}}return b};Array.prototype.remove=function(c,b){var a=this.slice((b||c)+1||this.length);this.length=c<0?this.length+c:c;return this.push.apply(this,a)};var planZilla={is_array:function(a){return a&&typeof a==="object"&&typeof a.length==="number"&&typeof a.splice==="function"&&!(a.propertyIsEnumerable("length"))},convert_to_array:function(a){return(!this.is_array(a))?[a]:a},initial_dom:$("table.bz_buglist"),bz_tickets:{},drawn_instance:{},get_tickets:function(b,e){var a=this,c={},d=Number(new Date());b=$.map(b,function(g,f){return(!a.bz_tickets[g])?g:null});c={ctype:"xml",excludefield:"attachmentdata",id:b};$.ajax({url:"https://bugzilla.vclk.net/show_bug.cgi",data:c,cache:false,traditional:true,type:"POST",async:false,success:function(h,m,j){var f=$.xml2json(h,true),i=$.xml2json(h),k=Number(new Date()),g=[],l=["dependson","blocked"];if(i&&i.bug){i.bug=a.convert_to_array(i.bug);$.each(i.bug,function(o,p){var n;if(p.long_desc){p.long_desc=a.convert_to_array(p.long_desc)}if(p.attachment){p.attachment=a.convert_to_array(p.attachment)}n=p.bug_id;a.bz_tickets[n]=p;a.bz_tickets[n].dependson=f.bug[o].dependson?f.bug[o].dependson:[];a.bz_tickets[n].blocked=f.bug[o].blocked?f.bug[o].blocked:[];a.bz_tickets[n].timestamp=k;$.each(l,function(r,q){$.each(a.bz_tickets[n][q],function(s,t){a.bz_tickets[n][q][s]=this.text;g.push(this.text)})})});a.get_tickets.call(a,g);if(e){e()}}}})},find_initial_tickets:function(){var a=this;a.initial_tickets=[];switch(window.location.pathname){case ("/show_bug.cgi"):a.initial_tickets.push(window.location.search.replace(/\D/g,""));a.result_field='form[name="changeform"]';break;case ("/buglist.cgi"):$("table.bz_buglist td.first-child a").each(function(b){a.initial_tickets.push($(this).text())});a.result_field="table.bz_buglist";break;default:$("table.bz_buglist td.first-child a").each(function(b){a.initial_tickets.push($(this).text())});a.result_field="table.bz_buglist"}$(a.result_field).replaceWith(a.create_dom.buglist_div());$("div.pZ_buglist").append(a.create_dom.loading_ajax());a.get_tickets(a.initial_tickets);$("div.pZ_buglist").replaceWith(a.create_dom.buglist_div());a.draw(a.get_top_level_tickets())},get_top_level_tickets:function(){var b=this,c=[],a=[];$.each(b.bz_tickets,function(d,e){if(e.target_milestone==="PRD Complete"){delete b.bz_tickets[d];c.push(d)}});$.each(b.bz_tickets,function(d,e){$.each(e.blocked,function(f,g){if($.inArray(g,c)>=0){e.blocked.remove(f)}})});$.each(b.bz_tickets,function(d,e){if(e.blocked.length===0){a.push(d)}});return a},draw:function(b){var a=this;$.each(b,function(c,d){a.draw_ticket(a.bz_tickets[d]);$.each(a.bz_tickets[d].dependson,function(e,f){a.draw.call(a,[f])})})},draw_ticket:function(c){var a=this,b={};b=a.create_dom.buglist_item.using(c);if(c.blocked.length>0){$.each(c.blocked,function(e,f){var d=$(".pZ_"+f);if((d.length>0)&&(!a.drawn_instance["a"+c.bug_id+"b"+f])){a.drawn_instance["a"+c.bug_id+"b"+f]=true;$(d).append(b.clone(true)).fadeIn()}})}else{$(b).css({background:"url("+chrome.extension.getURL("images/transparent_bkg.png")+") repeat",borderBottom:"1px solid #4b0607",borderRight:"1px solid #4b0607",marginBottom:"1.1em",padding:".5em"});$("div.pZ_buglist").append(b).fadeIn()}},create_dom:{buglist_div:function(){return $("<div/>",{css:{background:"url("+chrome.extension.getURL("images/planZilla_bkg.png")+") repeat"},"class":"pZ_buglist",html:$("<div/>")})},loading_ajax:function(){return $("<div/>",{css:{textAlign:"center"},html:$("<img/>",{src:chrome.extension.getURL("images/ajax-loader.gif")})}).append("loading...")},planZilla_box:function(){return $('<div id="facebox"><div><h2><img src="'+chrome.extension.getURL("images/text_icon.png")+'"></h2><div id="facebox_content"></div><button class="close"> Close </button></div></div>')},ticket_comments:function(){var a=this,b=$(planZilla.create_dom.planZilla_box());$.each(a.long_desc,function(c,d){if(!d.thetext){return true}var e=$("<div/>").append($("<h3/>",{text:d.who})).append($("<h5/>",{text:d.bug_when,css:{textAlign:"right"}})).append($("<p/>",{html:d.thetext})).append("<hr/>");$("#facebox_content",b).append(e)});return b},buglist_item:function(){var b=this,a=(this.attachment)?this.attachment.length:0,c=(this.long_desc)?this.long_desc.length:0;return $("<div/>",{"class":"pZ_bugitem  pZ_severity_"+b.bug_severity+" pZ_bugstatus_"+b.bug_status+" pZ_"+b.bug_id,}).append($("<div/>",{"class":"pZ_floatLeft",html:$("<a/>",{href:"https://bugzilla.vclk.net/show_bug.cgi?id="+b.bug_id,text:b.bug_id})})).append($("<div/>",{"class":"pZ_floatLeft",text:b.priority,title:b.priority+" - "+b.bug_severity})).append($("<div/>",{"class":"pZ_floatLeft pZ_short_desc",text:b.short_desc,title:b.short_desc})).append($("<div/>",{"class":"pZ_floatRight",html:$("<span/>",{"class":"pZ_bugStatus",css:{background:"url("+chrome.extension.getURL("images/bug_status/"+b.bug_status+".png")+") center no-repeat"},title:b.bug_status,text:b.resolution})})).append($("<div/>",{"class":"pZ_floatRight pZ_comments",click:function(){$(planZilla.create_dom.ticket_comments.using(b)).appendTo("body").overlay({expose:{color:"#fff",loadSpeed:200,opacity:0.5},api:true,speed:"slow",onClose:function(){$("#facebox").next().remove();$("#facebox").remove()}}).load()},html:$("<span/>",{"class":"pZ_bugNotice",css:{background:"url("+chrome.extension.getURL("images/comments.png")+") center no-repeat"},text:c})})).append($("<div/>",{"class":"pZ_floatRight",html:$("<span/>",{"class":"pZ_bugNotice",css:{background:"url("+chrome.extension.getURL("images/attachments.png")+") center no-repeat"},text:a})})).append($("<div/>",{"class":"pZ_floatRight pZ_target_milestone",text:b.target_milestone,title:b.target_milestone})).append($("<div/>",{"class":"pZ_floatRight pZ_assigned_to",text:b.assigned_to,title:b.assigned_to})).append($("<div/>",{"class":"clear"}))}}};$(document).ready(function(){$("#LeftSideBar").prepend($("<img/>",{src:chrome.extension.getURL("images/transparent_icon.png"),click:function(){planZilla.find_initial_tickets()},"class":"pZ_icon"}))});