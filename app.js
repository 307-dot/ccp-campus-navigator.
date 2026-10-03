
(() => {
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const routeSvg = $("#routeSvg"), routeLine = $("#routeLine"), routeGlow = $("#routeGlow"),
        arrowGroup = $("#routeArrows"), locationMarker = $("#locationMarker"), destinationMarker = $("#destinationMarker");
  const drawer = $("#drawer"), scrim = $("#scrim"), themeBtn = $("#themeBtn");
  const destinationTitle = $("#destinationTitle"), destinationMeta = $("#destinationMeta"),
        startText = $("#startText"), destText = $("#destText"), floorLabel = $("#floorLabel"),
        drawerFloorText = $("#drawerFloorText"), accessibleToggle = $("#accessibleToggle");
  const modalBackdrop = $("#modalBackdrop"), modalTitle = $("#modalTitle"), modalBody = $("#modalBody");
  const toast = $("#toast"), navigationPanel = $("#navigationPanel"), nextStep = $("#nextStep");

  function safeStorageGet(key, fallback){
    try { return window.localStorage ? (localStorage.getItem(key) || fallback) : fallback; }
    catch(e){ return fallback; }
  }
  function safeStorageSet(key, value){
    try { if(window.localStorage) localStorage.setItem(key, value); }
    catch(e){}
  }

  const state = {
    theme: safeStorageGet("ccp-theme", "light"),
    floor: "Ground Floor",
    start: "Your Location",
    destination: "Conference Room A",
    accessible: false,
    routeVisible: true,
    navigating: false
  };

  const points = {
    "Your Location": [1210, 790],
    "Main Entrance": [1320, 835],
    "Elevator": [1130, 785],
    "Conference Room A": [300, 365],
    "BG-14": [810, 390],
    "Information Desk": [585, 310],
    "Stairs": [680, 810]
  };

  const destinationInfo = {
    "Conference Room A": "Ground Floor · ~ 3 min (250 m)",
    "BG-14": "Ground Floor · ~ 2 min (170 m)",
    "Information Desk": "Ground Floor · ~ 2 min (140 m)",
    "Elevator": "Ground Floor · ~ 1 min (80 m)",
    "Stairs": "Ground Floor · ~ 2 min (160 m)"
  };

  function toastMsg(msg){
    toast.textContent = msg; toast.classList.add("show");
    clearTimeout(window.__toastTimer);
    window.__toastTimer = setTimeout(()=>toast.classList.remove("show"), 2100);
  }

  function openDrawer(){ drawer.classList.add("open"); scrim.classList.add("show"); drawer.setAttribute("aria-hidden","false"); }
  function closeDrawer(){ drawer.classList.remove("open"); scrim.classList.remove("show"); drawer.setAttribute("aria-hidden","true"); }
  $("#menuBtn").addEventListener("click", openDrawer, {passive:true});
  $("#closeDrawer").addEventListener("click", closeDrawer, {passive:true});
  scrim.addEventListener("click", closeDrawer, {passive:true});

  function applyTheme(){
    document.body.classList.toggle("dark", state.theme === "dark");
    document.querySelector('meta[name="theme-color"]').setAttribute("content", state.theme === "dark" ? "#0c1013" : "#ffffff");
    safeStorageSet("ccp-theme", state.theme);
  }
  themeBtn.onclick = () => { state.theme = state.theme === "dark" ? "light" : "dark"; applyTheme(); };
  applyTheme();

  function manhattanRoute(a,b){
    const [sx,sy] = a, [dx,dy] = b;
    const y1 = sy - 85;
    const midX = Math.round((sx+dx)/2);
    return [[sx,sy],[sx,y1],[midX,y1],[midX,dy],[dx,dy]];
  }

  function arrowsFor(pointsArr){
    arrowGroup.innerHTML = "";
    for(let i=0;i<pointsArr.length-1;i++){
      const [x1,y1]=pointsArr[i], [x2,y2]=pointsArr[i+1];
      const mx=(x1+x2)/2,my=(y1+y2)/2;
      const angle=Math.atan2(y2-y1,x2-x1)*180/Math.PI;
      const p=document.createElementNS("http://www.w3.org/2000/svg","path");
      p.setAttribute("d","M -14 -10 L 12 0 L -14 10 Z");
      p.setAttribute("class","route-arrow");
      p.setAttribute("transform",`translate(${mx} ${my}) rotate(${angle})`);
      arrowGroup.appendChild(p);
    }
  }

  function updateRoute(){
    const startP = points[state.start] || points["Your Location"];
    const destP = points[state.destination] || points["Conference Room A"];
    const arr = manhattanRoute(startP,destP);
    const str = arr.map(p=>p.join(",")).join(" ");
    routeLine.setAttribute("points",str); routeGlow.setAttribute("points",str); arrowsFor(arr);
    locationMarker.setAttribute("transform",`translate(${startP[0]} ${startP[1]})`);
    destinationMarker.setAttribute("transform",`translate(${destP[0]} ${destP[1]})`);
    routeSvg.style.display = state.routeVisible ? "block" : "none";
    destinationTitle.textContent = state.destination;
    destinationMeta.textContent = destinationInfo[state.destination] || `${state.floor} · route preview`;
    startText.textContent = state.start; destText.textContent = state.destination;
    floorLabel.textContent = state.floor; drawerFloorText.textContent = state.floor;
  }

  function openModal(title, content){
    modalTitle.textContent = title; modalBody.innerHTML = content; modalBackdrop.classList.add("show");
  }
  function closeModal(){ modalBackdrop.classList.remove("show"); }
  $("#modalClose").onclick = closeModal;
  modalBackdrop.addEventListener("click",e=>{ if(e.target===modalBackdrop) closeModal(); });

  const destinations = ["Conference Room A","BG-14","Information Desk","Elevator","Stairs"];
  const starts = ["Your Location","Main Entrance","Elevator"];

  function chooseList(kind){
    const list = kind==="destination" ? destinations : starts;
    const selected = kind==="destination" ? state.destination : state.start;
    openModal(kind==="destination" ? "Choose destination" : "Choose start",
      `<div class="choice-list">${list.map(x=>`<button class="choice" data-choice="${x}">${x}<small>${x===selected?"Currently selected":"Tap to select"}</small></button>`).join("")}</div>`);
    $$("#modalBody .choice").forEach(btn=>btn.onclick=()=>{
      if(kind==="destination") state.destination=btn.dataset.choice; else state.start=btn.dataset.choice;
      state.routeVisible=true; state.navigating=false; navigationPanel.classList.add("hidden");
      updateRoute(); closeModal(); toastMsg(`${kind==="destination"?"Destination":"Start"} updated`);
    });
  }

  $("#changeBtn").onclick = ()=>chooseList("destination");
  $("#destSelectBtn").onclick = ()=>chooseList("destination");
  $("#startSelectBtn").onclick = ()=>chooseList("start");

  function floorChooser(){
    openModal("Choose floor", `<div class="choice-list">
      <button class="choice" data-floor="Ground Floor">Ground Floor<small>Available in this prototype</small></button>
      <button class="choice" data-floor="First Floor">First Floor<small>Preview placeholder</small></button>
      <button class="choice" data-floor="Second Floor">Second Floor<small>Preview placeholder</small></button>
    </div>`);
    $$("#modalBody .choice").forEach(btn=>btn.onclick=()=>{
      const f=btn.dataset.floor;
      if(f!=="Ground Floor"){ toastMsg(`${f} map is not included in this prototype yet.`); return; }
      state.floor=f; updateRoute(); closeModal();
    });
  }
  $("#floorBtn").onclick=floorChooser; $("#drawerFloorBtn").onclick=floorChooser;

  $("#searchBtn").onclick=()=>chooseList("destination");
  $("#locateBtn").onclick=()=>{
    state.start="Your Location"; state.routeVisible=true; updateRoute();
    locationMarker.classList.add("pulse"); setTimeout(()=>locationMarker.classList.remove("pulse"),1600);
    toastMsg("Current location selected");
  };

  accessibleToggle.onchange=()=>{ state.accessible=accessibleToggle.checked; toastMsg(state.accessible?"Accessible route enabled":"Standard route enabled"); };
  $("#applyRouteBtn").onclick=()=>{
    state.accessible=accessibleToggle.checked; state.routeVisible=true; state.navigating=false;
    navigationPanel.classList.add("hidden"); updateRoute(); closeDrawer();
    toastMsg(state.accessible?"Accessible route applied":"Route applied");
  };

  $("#clearBtn").onclick=()=>{
    state.routeVisible=false; state.navigating=false; navigationPanel.classList.add("hidden"); updateRoute();
    $("#startBtnLabel").textContent="Start Navigation"; toastMsg("Route cleared");
  };

  $("#startBtn").onclick=()=>{
    if(!state.routeVisible){ state.routeVisible=true; updateRoute(); }
    state.navigating=!state.navigating;
    navigationPanel.classList.toggle("hidden",!state.navigating);
    $("#startBtnLabel").textContent=state.navigating?"Navigation Active":"Start Navigation";
    nextStep.textContent = state.accessible ? "Follow the highlighted accessible route toward the elevator." : "Follow the highlighted hallway toward your destination.";
    toastMsg(state.navigating?"Navigation started":"Navigation paused");
  };
  $("#stopNavBtn").onclick=()=>{
    state.navigating=false; navigationPanel.classList.add("hidden"); $("#startBtnLabel").textContent="Start Navigation"; toastMsg("Navigation stopped");
  };

  $("#elevatorCard").onclick=()=>openModal("Elevator Status", `<div class="choice-list"><div class="choice">Main elevators: Operational<small>This is prototype status data, not live campus data.</small></div><div class="choice">Accessibility note<small>Always verify elevator availability before relying on an accessible route.</small></div></div>`);

  $("#reportBtn").onclick=()=>{
    openModal("Report an issue", `<form class="report-form" id="reportForm"><select><option>Elevator unavailable</option><option>Hallway blocked</option><option>Incorrect room location</option><option>Other</option></select><textarea placeholder="Describe the issue..."></textarea><button type="submit">Submit report</button></form>`);
    $("#reportForm").onsubmit=e=>{e.preventDefault();closeModal();closeDrawer();toastMsg("Issue added to the prototype report queue");};
  };

  $("#aboutBtn").onclick=()=>openModal("About this prototype", `<div class="choice-list"><div class="choice">CCP Campus Navigator<small>An independent student prototype for indoor campus wayfinding. Built with AI assistance for ideation, interface refinement, and prototyping. Not an official Community College of Philadelphia product.</small></div></div>`);

  $$("[data-toast]").forEach(b=>b.onclick=()=>toastMsg(b.dataset.toast));
  document.addEventListener("keydown",e=>{if(e.key==="Escape"){closeDrawer();closeModal();}});
  updateRoute();
})();
