function supportStorage(){try{return"localStorage"in window&&null!==window.localStorage}catch(e){return!1}}function init(){if($(".page").hide(0),!supportStorage())return alert("Скачай нормальный браузер, динозавр!"),!1;token=localStorage.getItem("token"),$.ajax({url:INIT_URL,method:"GET",dataType:"json",data:{token:token},success:function(e){console.log("successfully run ajax request...",e),serverVersion=e.version,apiUrl=e.apiUrl,fs=e.fs,$(".data-server-version").text(serverVersion),$(".data-version").text(version),e.isGuest?(viewPage("login"),hidePreloader()):(launch(),hidePreloader())},error:jsError})}function viewPage(e,t){$(".page").hide(0),$("#navigation .nav-item").removeClass("active"),$('#navigation .nav-item[data-menu-page="'+e+'"]').addClass("active");var n=$('#navigation .nav-item[data-menu-page="'+e+'"] a').text();$(".data-title").text(n),$("#page-"+e).show(0),t||history.pushState(null,document.title,e),console.log("Change page ",appPageCurrent,"=>",e),document.title=n||"PSF Panel"}function launch(){$.ajax({url:apiUrl+"user/me",method:"GET",dataType:"json",data:{token:token},success:function(e){localStorage.setItem("token",token),$(".data-account-name").text(e.name),viewPage(appPageCurrent)},error:jsError})}function logout(){localStorage.setItem("token",null),token=null,init()}function hidePreloader(){$(".preloader").fadeOut(300)}function showPreloader(){$(".preloader").fadeIn(300)}const version="3.0.0 Alpha";var serverVersion="unknown",apiUrl=!1,token="";$(function(){init()});var jsError=function(e){toastr.error(e.responseJSON.error.message,"Ошибка"),console.error(e),403==e.status&&console.warning("unauthorized")};$(function(){$(document).on("click",".presets-create",function(e){e.preventDefault(),$("#createPreset").modal("show")})});var appPageCurrent="main";window.addEventListener("popstate",function(e){return console.log(window.location.pathname.substr(1)),viewPage(window.location.pathname.substr(1),!0),!1}),$(function(){appPageCurrent=window.location.pathname.substr(1).length?window.location.pathname.substr(1):"main",$(document).on("click",".menu-link",function(e){e.preventDefault(),viewPage($(this).attr("href").substr(1)),$("#bodyClick").trigger("click")}),$(document).on("submit","#form-login",function(e){e.preventDefault();var t=$(this).serialize()+"&token="+token;$.ajax({url:apiUrl+"auth",method:"POST",dataType:"json",data:t,success:function(e){token=e.token,showPreloader(),launch()},error:jsError})}),$(document).on("click",".logout",function(e){e.preventDefault(),logout()})});