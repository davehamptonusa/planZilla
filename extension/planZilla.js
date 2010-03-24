Function.prototype.using=Function.call;Object.spawn=function(e,a){var d=function(){},c={},b={};d.prototype=e;c=new d();for(b in a){c[b]=a[b]}return c};Object.size=function(c){var b=0,a;for(a in c){if(c.hasOwnProperty(a)){b++}}return b};Array.prototype.remove=function(c,b){var a=this.slice((b||c)+1||this.length);this.length=c<0?this.length+c:c;return this.push.apply(this,a)};var planZilla={is_array:function(a){return a&&typeof a==="object"&&typeof a.length==="number"&&typeof a.splice==="function"&&!(a.propertyIsEnumerable("length"))},convert_to_array:function(a){return(!this.is_array(a))?[a]:a},initial_dom:$("table.bz_buglist"),bz_tickets:{},drawn_instance:{},get_tickets:function(b,e){var a=this,c={},d=Number(new Date());b=$.map(b,function(g,f){return(!a.bz_tickets[g])?g:null});c={ctype:"xml",excludefield:"attachmentdata",id:b};$.ajax({url:"https://bugzilla.vclk.net/show_bug.cgi",data:c,cache:false,traditional:true,type:"POST",async:false,success:function(h,m,j){var f=$.xml2json(h,true),i=$.xml2json(h),k=Number(new Date()),g=[],l=["dependson","blocked"];if(i&&i.bug){i.bug=a.convert_to_array(i.bug);$.each(i.bug,function(o,p){var n;if(p.long_desc){p.long_desc=a.convert_to_array(p.long_desc)}if(p.attachment){p.attachment=a.convert_to_array(p.attachment)}n=p.bug_id;a.bz_tickets[n]=p;a.bz_tickets[n].dependson=f.bug[o].dependson?f.bug[o].dependson:[];a.bz_tickets[n].blocked=f.bug[o].blocked?f.bug[o].blocked:[];a.bz_tickets[n].timestamp=k;$.each(l,function(r,q){$.each(a.bz_tickets[n][q],function(s,t){a.bz_tickets[n][q][s]=this.text;g.push(this.text)})})});a.get_tickets.call(a,g);if(e){e()}}}})},find_initial_tickets:function(){var a=this;a.initial_tickets=[];switch(window.location.pathname){case ("/show_bug.cgi"):a.initial_tickets.push(window.location.search.replace(/\D/g,""));a.result_field='form[name="changeform"]';break;case ("/buglist.cgi"):$("table.bz_buglist td.first-child a").each(function(b){a.initial_tickets.push($(this).text())});a.result_field="table.bz_buglist";break;default:$("table.bz_buglist td.first-child a").each(function(b){a.initial_tickets.push($(this).text())});a.result_field="table.bz_buglist"}$(a.result_field).replaceWith(a.create_dom.buglist_div());$("div.pZ_buglist").append(a.create_dom.loading_ajax());a.get_tickets(a.initial_tickets);$("div.pZ_buglist").replaceWith(a.create_dom.buglist_div());a.draw(a.get_top_level_tickets())},get_top_level_tickets:function(){var b=this,c=[],a=[];$.each(b.bz_tickets,function(d,e){if(e.target_milestone==="PRD Complete"){delete b.bz_tickets[d];c.push(d)}});$.each(b.bz_tickets,function(d,e){$.each(e.blocked,function(f,g){if($.inArray(g,c)>=0){e.blocked.remove(f)}})});$.each(b.bz_tickets,function(d,e){if(e.blocked.length===0){a.push(d)}});return a},draw:function(b){var a=this;$.each(b,function(c,d){a.draw_ticket(a.bz_tickets[d]);$.each(a.bz_tickets[d].dependson,function(e,f){a.draw.call(a,[f])})})},draw_ticket:function(c){var a=this,b={};b=a.create_dom.buglist_item.using(c);$("tr, div",b).addClass("pZ_severity_"+c.bug_severity+" pZ_bugstatus_"+c.bug_status);if(c.blocked.length>0){$.each(c.blocked,function(e,f){var d=$("div.pZ_bugitem > table > tbody > tr > td > a:contains("+f+")");if((d.length>0)&&(!a.drawn_instance["a"+c.bug_id+"b"+f])){a.drawn_instance["a"+c.bug_id+"b"+f]=true;$(d).parents("div:first").append(b.clone()).fadeIn()}})}else{$("table",b).parent().css({background:"url("+chrome.extension.getURL("images/transparent_bkg.png")+") repeat",borderBottom:"1px solid #4b0607",borderRight:"1px solid #4b0607",marginBottom:"1.1em",padding:".5em"});$("div.pZ_buglist").append(b).fadeIn()}},create_dom:{buglist_div:function(){return $("<div/>",{css:{background:"url("+chrome.extension.getURL("images/planZilla_bkg.png")+") repeat"},"class":"pZ_buglist",html:$("<div/>")})},loading_ajax:function(){return $("<div/>",{css:{textAlign:"center"},html:$("<img/>",{src:chrome.extension.getURL("images/ajax-loader.gif")})}).append("loading...")},buglist_item:function(){var a=(this.attachment)?this.attachment.length:0,b=(this.long_desc)?this.long_desc.length:0;return $("<div/>",{"class":"pZ_bugitem",html:$("<table/>",{"class":"pZ_floatLeft",html:$("<tr/>",{"class":"pZ_bugstatus_"+this.bug_status,html:$("<td/>",{html:$("<a/>",{href:"https://bugzilla.vclk.net/show_bug.cgi?id="+this.bug_id,text:this.bug_id})})}).append($("<td/>",{text:this.priority}))})}).append($("<div/>",{"class":"pZ_floatLeft pZ_short_desc",text:this.short_desc,title:this.short_desc})).append($("<div/>",{"class":"pZ_floatRight",html:$("<span/>",{"class":"pZ_bugStatus",css:{background:"url("+chrome.extension.getURL("images/bug_status/"+this.bug_status+".png")+") center no-repeat"},title:this.bug_status,text:this.resolution})})).append($("<div/>",{"class":"pZ_floatRight",html:$("<span/>",{"class":"pZ_bugNotice",css:{background:"url("+chrome.extension.getURL("images/comments.png")+") center no-repeat"},text:b})})).append($("<div/>",{"class":"pZ_floatRight",html:$("<span/>",{"class":"pZ_bugNotice",css:{background:"url("+chrome.extension.getURL("images/attachments.png")+") center no-repeat"},text:a})})).append($("<div/>",{"class":"pZ_floatRight pZ_target_milestone",text:this.target_milestone,title:this.target_milestone})).append($("<div/>",{"class":"pZ_floatRight pZ_assigned_to",text:this.assigned_to,title:this.assigned_to})).append($("<div/>",{"class":"clear"}))}}};$(document).ready(function(){$("#LeftSideBar").prepend($("<img/>",{src:chrome.extension.getURL("images/transparent_icon.png"),click:function(){planZilla.find_initial_tickets()},"class":"pZ_icon"}))});