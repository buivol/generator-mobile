function supportStorage(){try{return"localStorage"in window&&null!==window.localStorage}catch(e){return!1}}function init(){if($(".page").hide(0),!supportStorage())return alert("Скачай нормальный браузер, динозавр!"),!1;token=localStorage.getItem("token"),$.ajax({url:INIT_URL,method:"GET",dataType:"json",data:{token:token},success:function(e){console.log("successfully run ajax request...",e),serverVersion=e.version,apiUrl=e.apiUrl,fs=e.fs,$(".data-server-version").text(serverVersion),$(".data-version").text(version),e.isGuest?(viewPage("login"),hidePreloader()):(launch(),hidePreloader())},error:jsError})}function makeid(){for(var e="",t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789",n=0;n<15;n++)e+=t.charAt(Math.floor(Math.random()*t.length));return e}function presetsInit(){presetsUpdate()}function presetsUpdate(){$.ajax({url:apiUrl+"groups",method:"GET",dataType:"json",data:{token:token},success:function(e){var t="";e.count.all<1?$("#no-presets").show(0):$("#no-presets").hide(0),$.each(e.items,function(e,n){t+='<div class="col-sm-6"><div class="card preset-item" data-id="'+n.id+'">',t+="<h3>"+n.name+"</h3>",t+='<div class="row"><div class="col-sm-6">',t+="<p>Автор: <code>"+n.owner.username+"</code></p>",t+="<p>Изменён: <code>"+moment.unix(n.updated,"time").format("HH:mm DD.MM.YYYY")+"</code></p>",t+='</div><div class="col-sm-6 h-dr h-mc actions">',t+='<button class="btn btn-info btn-icon btn-icon-mini btn-round action-edit" data-id="'+n.id+'"><i class="fa fa-pencil"></i></button>',t+='<button class="btn btn-info btn-icon btn-icon-mini btn-round action-share" data-id="'+n.id+'"><i class="fa fa-share-alt"></i></button>',t+='<button class="btn btn-danger btn-icon btn-icon-mini btn-round action-delete" data-id="'+n.id+'"><i class="fa fa-trash"></i></button>',t+="</div></div></div></div>"}),$("#presets-items").html(t),formLoaderStop(),updateUIPresets(e.presets)},error:jsError})}function pricesInit(){}function viewPage(e,t){$(".page").hide(0),$("#navigation .nav-item").removeClass("active"),$('#navigation .nav-item[data-menu-page="'+e+'"]').addClass("active");var n=$('#navigation .nav-item[data-menu-page="'+e+'"] a').text();$(".data-title").text(n),$("#page-"+e).show(0),t||history.pushState(null,document.title,e),console.log("Change page ",appPageCurrent,"=>",e),document.title=n||"PSF Panel","presets"==e?presetsInit():"categories"==e||"prices"==e&&pricesInit()}function formLoaderStart(){$("#form-loader").show(0)}function formLoaderStop(){$("#form-loader").hide(0)}function updateMiscImages(){$.ajax({url:apiUrl+"images/misc",method:"GET",dataType:"json",data:{token:token},success:function(e){miscImages=e,$("input.miscimage").each(function(){makeid();$(this).selectize({options:e,maxItems:1,labelField:"name",valueField:"path",searchField:["name"],render:{option:function(e,t){return'<div class="misc-image-item"><img src="'+t(e.url)+'" alt=""><span class="name">'+t(e.name)+"</span></div>"}}})})},error:jsError})}function resetMiscImages(){var e=$("input.miscimage");e.each(function(e){if($("input.miscimage").selectize)try{$(this).selectize()[0].selectize.destroy()}catch(e){}}),e.removeClass("selectized").show(0),$("div.miscimage").remove()}function updateUIPresets(e){_selectHtml="",e.count<1?"presets"!==appPageCurrent&&viewPage("presets"):$.each(e.items,function(e,t){_selectHtml+='<option value="'+t.id+'" '+(t.active?"selected":"")+">"+t.name+"</option>"}),$("#preset-select").html(_selectHtml)}function launch(){$.ajax({url:apiUrl+"user/me",method:"GET",dataType:"json",data:{token:token},success:function(e){localStorage.setItem("token",token),$(".data-account-name").text(e.name),viewPage(appPageCurrent),updateUIPresets(e.presets)},error:jsError})}function logout(){localStorage.setItem("token",null),token=null,init()}function hidePreloader(){$(".preloader").fadeOut(300)}function showPreloader(){$(".preloader").fadeIn(300)}function syncScroll(){var e=window.pageYOffset||document.documentElement.scrollTop,t=topped;(topped=!(e>=63))!=t&&(topped?$("body").addClass("topped"):$("body").removeClass("topped"))}const version="3.0.0 Alpha";var serverVersion="unknown",apiUrl=!1,token="";$(function(){init()});var jsError=function(e){toastr.error(e.responseJSON.error.message,"Ошибка"),console.error(e),403==e.status&&console.warning("unauthorized"),formLoaderStop()};$(function(){$(document).on("click",".presets-create",function(e){e.preventDefault(),resetMiscImages(),updateMiscImages(),$("#form-preset").data("preset","new"),$("#createPreset").modal("show")}),$(document).on("submit","#form-preset",function(e){e.preventDefault(),formLoaderStart();var t=$(this).serialize()+"&token="+token,n=apiUrl+"groups";"new"!=$(this).data("preset")&&(n+="/"+$(this).data("preset")),$.ajax({url:n,method:"POST",dataType:"json",data:t,success:function(e){$("#form-preset").trigger("reset"),$("#createPreset").modal("hide"),toastr.success(e.message,"Успех"),presetsUpdate(),updateUIPresets(e.presets)},error:jsError})}),$(document).on("click",".preset-item .action-edit",function(e){e.preventDefault(),formLoaderStart();var t=$(this).data("id");$("#form-preset").data("preset",t),resetMiscImages(),$.ajax({url:apiUrl+"groups/"+t,method:"GET",data:{token:token},dataType:"json",success:function(e){$("#form-preset").trigger("reset"),$('#form-preset input[type="checkbox"]').removeAttr("checked"),$("#presetName").val(e.name),$("#s-creator").val(e.fields.creator),$("#s-logo").val(e.fields.logo),$("#s-pkname").val(e.fields.pkname),$("#s-pkheader").val(e.fields.pkheader),"1"==e.fields.pksheets&&$("#s-pksheets").attr("checked","checked"),$("#s-p1kname").val(e.fields.p1name),$("#s-p1header").val(e.fields.p1header),"1"==e.fields.p1sheets&&$("#s-p1sheets").attr("checked","checked"),"1"==e.fields.p1active&&$("#s-p1active").attr("checked","checked"),$("#s-p5kname").val(e.fields.p5name),$("#s-p5header").val(e.fields.p5header),"1"==e.fields.p5sheets&&$("#s-p5sheets").attr("checked","checked"),"1"==e.fields.p5active&&$("#s-p5active").attr("checked","checked"),"1"==e.fields.grouped&&$("#s-grouped").attr("checked","checked"),"1"==e.fields.groupedhide&&$("#s-groupedhide").attr("checked","checked"),formLoaderStop(),presetsUpdate(),updateMiscImages(),$("#createPreset").modal("show"),updateUIPresets(e.presets)},error:jsError})}),$(document).on("click",".preset-item .action-delete",function(e){e.preventDefault();var t=$(this).data("id");swal({title:"Вы уверены?",text:"Это действие необратимо. Удалить пресет?",type:"warning",closeOnConfirm:!1,confirmButtonColor:"#2CA8FF",confirmButtonText:"Удалить",showLoaderOnConfirm:!0,showCancelButton:!0,cancelButtonText:"Отмена"},function(e){e&&$.ajax({url:apiUrl+"groups/"+t+"/delete",type:"POST",dataType:"json",data:{token:token},success:function(e){swal({title:"Успех",text:e.message,type:"success",confirmButtonColor:"#2CA8FF"},function(){presetsUpdate()}),updateUIPresets(e.presets)},error:jsError})})}),$(document).on("change","#preset-select",function(e){e.preventDefault();var t=$(this).val();$.ajax({url:apiUrl+"groups/"+t+"/select",type:"POST",dataType:"json",data:{token:token},success:function(e){updateUIPresets(e.presets)},error:jsError})})}),$(function(){$(document).on("click",".price-group-create",function(e){e.preventDefault(),$("#form-preset").data("preset","new"),$("#createPriceGroup").modal("show")})});var appPageCurrent="main",topped=!1,miscImages=[];window.addEventListener("popstate",function(e){return console.log(window.location.pathname.substr(1)),viewPage(window.location.pathname.substr(1),!0),!1}),$(function(){appPageCurrent=window.location.pathname.substr(1).length?window.location.pathname.substr(1):"main",$(document).on("click",".menu-link",function(e){e.preventDefault(),viewPage($(this).attr("href").substr(1)),$("#bodyClick").trigger("click")}),$(document).on("submit","#form-login",function(e){e.preventDefault();var t=$(this).serialize()+"&token="+token;$.ajax({url:apiUrl+"auth",method:"POST",dataType:"json",data:t,success:function(e){token=e.token,showPreloader(),launch()},error:jsError})}),$(document).on("click",".logout",function(e){e.preventDefault(),logout()}),syncScroll(),PullToRefresh.init({mainElement:"#c",passive:!1,shouldPullToRefresh:function(){return!$("body").hasClass("modal-open")&&topped},onRefresh:function(e){viewPage(appPageCurrent),setTimeout(function(){e()},1500)}})}),window.onscroll=function(){syncScroll()};