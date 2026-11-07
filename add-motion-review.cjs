const fs=require('fs');
let html=fs.readFileSync('index.html','utf8');
html=html.replace('<aside>','<div class="motion-review"><strong>태권도 동작 확인</strong><select id="reviewMove"><option value="kick">앞차기</option><option value="spin">돌려차기</option></select><button data-phase="0.25">무릎 들기</button><button data-phase="0.52">뻗기</button><button data-phase="0.85">회수·착지</button></div><aside>');
html=html.replace('</style>','.toolbar{flex-wrap:wrap;max-width:620px;justify-content:flex-end}.motion-review{position:absolute;right:20px;top:320px;display:flex;align-items:center;gap:7px;background:#10202add;padding:10px;border-radius:10px;font-size:12px}.motion-review strong{font-weight:500}.motion-review button{padding:8px}@media(max-width:700px){.motion-review{top:350px;right:10px;max-width:300px;flex-wrap:wrap}.toolbar{max-width:300px}} </style>');
fs.writeFileSync('index.html',html);
let main=fs.readFileSync('src/main.js','utf8');
main=main.replace("$('slow').onclick=",`for(const button of document.querySelectorAll('[data-phase]'))button.onclick=()=>{
 reset();paused=true;keys.clear();
 const type=$('reviewMove').value,progress=Number(button.dataset.phase);
 player.visual.pose(clock,false,{type,target:new Vector3(0,1.04,.83),progress});
 $('pause').textContent='대련 계속';$('status').textContent='동작 확인 · '+(type==='kick'?'앞차기':'돌려차기')+' / '+button.textContent;
};
$('slow').onclick=`);
fs.writeFileSync('src/main.js',main);
