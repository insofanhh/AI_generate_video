const $ = id => document.getElementById(id);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const defaults = { templateId:'frame-news', step:1, article:null, articleFailure:null, images:[], removedImages:[], scenes:[], selected:0, title:'', mode:'design', reference:null, previewJob:null, voicePreview:null, activeJobs:[], fields:{} };
let state = structuredClone(defaults);
try { const stored = JSON.parse(localStorage.getItem('newsroom-studio-v1') || 'null'); if (stored) state = {...state,...stored}; } catch {}
const fieldIds = ['article-url','source-title','source-text','recovery-title','recovery-text','script-language','target-duration','direction','voice-language','voice-speed','reference-text','voice-instruct','voice-steps','voice-guidance','voice-duration','voice-denoise','voice-preprocess','voice-postprocess','preview-text','video-aspect','video-theme','channel'];
const designKeys = ['gender','age','pitch','style','accent','dialect'];
let status = null;
let templateCatalog = [];
let templateEditorKey = '';
let previewDimensions = null;
let initialized = false;
let previewTimer;
let saveTimer;
let previewRevision = 0;
const templates = new Map();
const running = new Set();
function save() {
  fieldIds.concat(designKeys.map(k=>'design-'+k)).forEach(id=>{const el=$(id);if(el) state.fields[id]=el.type==='checkbox'?el.checked:el.value;});
  try { localStorage.setItem('newsroom-studio-v1',JSON.stringify(state)); $('draft-note').textContent='Đã lưu bản nháp trên trình duyệt này.'; }
  catch { $('draft-note').textContent='Bản nháp quá lớn hoặc trình duyệt không cho lưu. Giữ trang mở khi làm việc.'; }
}
function scheduleSave(){if(!initialized)return;clearTimeout(saveTimer);saveTimer=setTimeout(save,300);}
function notice(message,error=false){$('notice').textContent=message;$('notice').classList.toggle('error',error);$('notice').hidden=!message;}
async function api(path,body){const r=await fetch(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const data=await r.json();if(!r.ok)throw new Error(data.error||'Không thực hiện được yêu cầu.');return data;}
function action(fn){return async event=>{try{await fn(event);}catch(error){notice(error.message,true);}};}
function setStep(step){state.step=step;document.querySelectorAll('[data-panel]').forEach(el=>el.hidden=Number(el.dataset.panel)!==step);document.querySelectorAll('[data-step]').forEach(el=>{el.classList.toggle('current',Number(el.dataset.step)===step);el.classList.toggle('done',Number(el.dataset.step)<step);el.setAttribute('aria-current',Number(el.dataset.step)===step?'step':'false');});if(step===2)renderScenes();if(step===4)renderSummary();scheduleSave();updatePreview();}
document.querySelectorAll('[data-step],[data-go]').forEach(el=>el.onclick=()=>setStep(Number(el.dataset.step||el.dataset.go)));
function updateBusy(){const busy=running.size>0;['crawl-button','generate-script','regenerate','preview-voice','render-video','import-article-text','keep-previous-article'].forEach(id=>$(id).disabled=busy);}
async function watchJob(id,kind){
  if(running.has(id))return;running.add(id);updateBusy();$('job-panel').hidden=false;
  if(!state.activeJobs.some(j=>j.id===id)){state.activeJobs.push({id,kind});save();}
  let failures=0;
  while(running.has(id)){
    try{
      const job=await api('/api/jobs/'+id);failures=0;
      $('job-message').textContent=job.message;$('job-percent').textContent=job.progress+'%';$('job-progress').value=job.progress;$('job-logs').textContent=job.logs.join('\n');$('job-icon').classList.toggle('spinner',job.status==='running');$('job-error').hidden=job.status!=='error';
      if(job.status==='done'){
        $('job-icon').textContent='✓';running.delete(id);state.activeJobs=state.activeJobs.filter(j=>j.id!==id);applyResult(job);save();updateBusy();break;
      }
      if(job.status==='error'){
        if(job.kind==='article'){state.articleFailure={url:job.sourceUrl||$('article-url').value.trim(),message:job.error};renderArticle();}
        $('job-icon').textContent='!';$('job-message').textContent='Tác vụ chưa hoàn tất';$('job-error').textContent=job.error;notice(job.error,true);running.delete(id);state.activeJobs=state.activeJobs.filter(j=>j.id!==id);save();updateBusy();break;
      }
    }catch(error){
      failures++;$('job-message').textContent='Mất kết nối, đang thử lại…';
      if(failures>=10){notice('Mất kết nối máy chủ. Tải lại trang khi máy chủ hoạt động để khôi phục tiến độ.',true);running.delete(id);updateBusy();break;}
    }
    await new Promise(r=>setTimeout(r,1500));
  }
}
async function launch(kind,path,body){notice('');const job=await api(path,body);$('job-icon').textContent='';$('job-error').hidden=true;$('job-panel').hidden=false;void watchJob(job.id,kind);}
function applyResult(job){
  if(job.kind==='article'){
    state.article=job.result.article;state.articleFailure=null;$('article-url').value=state.article.url;$('recovery-title').value='';$('recovery-text').value='';state.images=job.result.images;state.removedImages=[];state.scenes=[];state.title='';state.selected=0;
    $('source-title').value=state.article.title;$('source-text').value=state.article.text;renderArticle();renderScenes();renderImages();updatePreview();
    notice(job.result.warning||`Đã đọc bài viết và lấy ${state.images.length} ảnh. Bấm “Tạo kịch bản bằng AI” để tiếp tục.`);
  }
  if(job.kind==='script'){
    state.title=job.result.title;state.scenes=job.result.scenes.map(scene=>({...scene,id:crypto.randomUUID(),imageIds:state.images[scene.imageIndex]?[state.images[scene.imageIndex].id]:[]}));state.selected=0;
    $('video-title').value=state.title;$('preview-text').value=state.scenes[0].voiceText.slice(0,1500);setStep(2);notice('Kịch bản đã sẵn sàng. Bạn có thể sửa lời đọc và chọn ảnh cho từng cảnh.');
  }
  if(job.kind==='voice'){
    state.previewJob=job.id;state.voicePreview={...job.result,voiceSnapshot:job.result.fingerprint};$('voice-player').src=job.result.src;$('voice-player').hidden=false;
    $('voice-preview-note').textContent='Đã tạo mẫu giọng. Nếu giữ nguyên cài đặt, video sẽ dùng chính giọng này.';notice('Đã tạo bản nghe thử. Bấm phát để nghe giọng trước khi render.');
  }
  if(job.kind==='render'){showResult(job.result);notice('Video đã xuất xong. Bạn có thể xem và tải xuống ngay.');setStep(4);}
}
function normalizedArticleUrl(value){try{const url=new URL(value);if(!/^https?:$/.test(url.protocol)||url.username||url.password)return '';url.hash='';return url.href;}catch{return '';}}
function articleSourceChanged(){const url=normalizedArticleUrl($('article-url').value.trim());return !!url&&url!==normalizedArticleUrl(state.article?.url||'');}
function renderArticle(){
  const url=normalizedArticleUrl($('article-url').value.trim());
  const failure=state.articleFailure&&normalizedArticleUrl(state.articleFailure.url)===url?state.articleFailure:null;
  const recovery=!!url&&(!!failure||articleSourceChanged());
  $('article-recovery').hidden=!recovery;$('open-source-article').href=url||'#';
  $('keep-previous-article').hidden=!state.article;
  $('article-recovery-reason').textContent=failure?.message||'Link này chưa được đọc. Bấm “Đọc bài viết” ở trên hoặc nhập nội dung cho link này bên dưới.';
  $('manual-details').hidden=recovery;
  $('article-card').hidden=!state.article||recovery;
  updatePreview();
  if(!state.article)return;
  $('article-domain').textContent=state.article.domain;$('article-title').textContent=state.article.title;$('article-count').textContent=`${state.article.text.split(/\s+/).length.toLocaleString('vi-VN')} từ · ${state.images.length} ảnh${state.article.publishedAt?' · '+state.article.publishedAt:''}`;
}
$('article-url').addEventListener('change',renderArticle);
$('article-url').addEventListener('input',renderArticle);
$('keep-previous-article').onclick=()=>{if(!state.article)return;$('article-url').value=state.article.url;state.articleFailure=null;renderArticle();notice('Đã quay lại nguồn bài trước.');save();};
$('article-text-file').onchange=action(async()=>{const input=$('article-text-file');try{const file=input.files[0];if(!file)return;if(!/\.txt$/i.test(file.name)||file.size>200000)throw new Error('Chọn file TXT UTF-8, tối đa 200 KB.');const text=await file.text();if(text.length>35000)throw new Error('Nội dung vượt quá 35.000 ký tự. Hãy rút gọn trước khi nhập.');$('recovery-text').value=text;if(!$('recovery-title').value)$('recovery-title').value=file.name.replace(/\.txt$/i,'').slice(0,240);save();}finally{input.value='';}});
$('import-article-text').onclick=action(async()=>{
  if(running.size)throw new Error('Chờ tác vụ đang chạy hoàn tất trước khi thay nội dung nguồn.');
  const url=normalizedArticleUrl($('article-url').value.trim()),text=$('recovery-text').value.trim(),title=$('recovery-title').value.trim();
  if(!url)throw new Error('Nhập link bài viết HTTP/HTTPS hợp lệ.');
  if(!title)throw new Error('Nhập tiêu đề bài viết mới.');
  if(text.length<120||text.length>35000)throw new Error('Nội dung cần từ 120 đến 35.000 ký tự.');
  applyResult({kind:'article',result:{article:{url,domain:new URL(url).hostname,title,text,publishedAt:'',images:[]},images:[]}});
  $('manual-details').open=true;$('job-panel').hidden=true;save();notice('Đã nhập nội dung cho đúng link nguồn. Bấm “Tạo kịch bản bằng AI” để tiếp tục.');
});
$('article-form').onsubmit=action(async event=>{event.preventDefault();await launch('article','/api/article',{url:$('article-url').value.trim()});});
async function generateScript(){
  if(articleSourceChanged()||state.articleFailure&&normalizedArticleUrl(state.articleFailure.url)===normalizedArticleUrl($('article-url').value.trim())){setStep(1);renderArticle();throw new Error('Link mới chưa có nội dung nguồn. Hãy đọc bài viết hoặc bấm “Dùng nội dung này” sau khi dán bài mới.');}
  const text=$('source-text').value.trim();if(text.length<120){setStep(1);$('manual-details').open=true;$('source-text').focus();throw new Error('Hãy đọc bài viết hoặc dán ít nhất 120 ký tự nội dung nguồn.');}
  const source={url:state.article?.url||'',domain:state.article?.domain||'local',publishedAt:state.article?.publishedAt||'',title:$('source-title').value.trim()||'Bài viết',text,images:state.images.map(img=>({url:img.originalUrl||img.src,alt:img.alt||''}))};
  state.article=source;const language=$('script-language').value;$('voice-language').value=language;save();
  await launch('script','/api/script',{article:source,language,duration:Number($('target-duration').value),direction:$('direction').value});
}
$('generate-script').onclick=action(generateScript);$('regenerate').onclick=action(generateScript);
function sceneRole(index){return index===0?'MỞ ĐẦU':index===state.scenes.length-1?'KẾT THÚC':'NỘI DUNG';}
function renderScenes(){
  $('script-empty').hidden=state.scenes.length>0;$('script-editor').hidden=!state.scenes.length;$('video-title').value=state.title;
  $('scene-total').textContent=`${state.scenes.length} cảnh · Chỉnh sửa trực tiếp`;$('add-scene').disabled=state.scenes.length>=8;
  $('scenes').innerHTML=state.scenes.map((scene,i)=>`<article class="scene ${i===state.selected?'selected':''}"><div class="scene-header"><button class="quiet scene-select" data-index="${i}" aria-label="Chọn cảnh ${i+1}">${String(i+1).padStart(2,'0')}</button><strong class="scene-select" data-index="${i}">${esc(scene.headline)}</strong><span class="scene-role">${sceneRole(i)}</span><button class="quiet scene-select" data-index="${i}" aria-label="Mở cảnh ${i+1}">${i===state.selected?'−':'＋'}</button></div><div class="scene-body" ${i===state.selected?'':'hidden'}><label for="scene-template-${i}">Template của cảnh</label><select id="scene-template-${i}" data-scene-template="${i}">${templateOptions(scene.templateId || state.templateId,true)}</select><p class="help">${templateInfo(effectiveTemplate(scene))?.images ? 'Ảnh từ thư viện sẽ xuất hiện trên mẫu.' : 'Mẫu chữ / đồ họa: ảnh đã chọn được giữ lại và không hiển thị trên mẫu này.'}</p><details class="template-fields" ${effectiveTemplate(scene)!=='frame-news'?'open':''} ${effectiveTemplate(scene)==='frame-news'?'hidden':''}><summary>Nội dung riêng của template</summary><p class="help">Chữ gợi ý được rút gọn theo diện tích mẫu. Chỉnh các ô bên dưới; lời đọc giữ nguyên.</p><div id="scene-template-fields-${i}"></div><button class="quiet" data-reset-template="${i}">↻ Lấy lại chữ từ kịch bản</button></details><label for="headline-${i}">Tiêu đề trên hình</label><input id="headline-${i}" data-field="headline" data-index="${i}" maxlength="120" value="${esc(scene.headline)}"><label for="summary-${i}">Mô tả trên hình</label><textarea id="summary-${i}" data-field="summary" data-index="${i}" maxlength="240" rows="2">${esc(scene.summary)}</textarea><label for="narration-${i}">Lời đọc</label><textarea id="narration-${i}" data-field="voiceText" data-index="${i}" maxlength="1800" rows="4">${esc(scene.voiceText)}</textarea><div class="scene-photo-strip">${scene.imageIds.map(id=>{const img=state.images.find(img=>img.id===id);return img?`<button data-remove-image="${esc(id)}" title="Bỏ ảnh khỏi cảnh" aria-label="Bỏ ảnh khỏi cảnh"><img src="${esc(img.src)}" alt="${esc(img.alt)}"><span>×</span></button>`:'';}).join('')}</div><p class="help">${scene.imageIds.length?'Ảnh phát lần lượt theo thứ tự chọn.':'Chưa có ảnh. Chọn ảnh trong thư viện bên dưới.'}</p><div class="scene-actions"><button class="quiet" data-move="-1" data-index="${i}" ${i===0?'disabled':''} title="Đưa cảnh lên trước">↑ Lên</button><button class="quiet" data-move="1" data-index="${i}" ${i===state.scenes.length-1?'disabled':''} title="Đưa cảnh xuống sau">↓ Xuống</button><button class="quiet" data-delete="${i}" ${state.scenes.length<=3?'disabled':''}>× Xóa cảnh</button></div></div></article>`).join('');
  $('scenes').querySelectorAll('.scene-select').forEach(el=>el.onclick=()=>{state.selected=Number(el.dataset.index);renderScenes();updatePreview();scheduleSave();});
  $('scenes').querySelectorAll('[data-field]').forEach(el=>el.oninput=()=>{state.scenes[Number(el.dataset.index)][el.dataset.field]=el.value;if(el.dataset.field==='headline')el.closest('.scene').querySelector('strong').textContent=el.value;scheduleSave();updatePreview();});
  $('scenes').querySelectorAll('[data-remove-image]').forEach(el=>el.onclick=()=>toggleImage(el.dataset.removeImage));
  $('scenes').querySelectorAll('[data-delete]').forEach(el=>el.onclick=()=>{state.scenes.splice(Number(el.dataset.delete),1);state.selected=Math.min(state.selected,state.scenes.length-1);renderScenes();scheduleSave();updatePreview();});
  $('scenes').querySelectorAll('[data-move]').forEach(el=>el.onclick=()=>{const from=Number(el.dataset.index),to=from+Number(el.dataset.move);[state.scenes[from],state.scenes[to]]=[state.scenes[to],state.scenes[from]];state.selected=to;renderScenes();scheduleSave();updatePreview();});
  wireTemplateEditors();
  renderImages();
}
$('video-title').oninput=()=>{state.title=$('video-title').value;scheduleSave();};
$('add-scene').onclick=()=>{if(state.scenes.length>=8)return;state.scenes.splice(state.scenes.length-1,0,{id:crypto.randomUUID(),headline:'Cảnh mới',summary:'',voiceText:'',imageIds:[]});state.selected=state.scenes.length-2;renderScenes();scheduleSave();updatePreview();};
function renderImages(){
  $('image-count').textContent=state.images.length;$('images-empty').hidden=state.images.length>0;
  const chosen=state.scenes[state.selected]?.imageIds||[];
  $('image-library').innerHTML=state.images.map((img,i)=>`<div class="image-card"><button class="image-item ${chosen.includes(img.id)?'chosen':''}" data-image="${esc(img.id)}" aria-pressed="${chosen.includes(img.id)}" title="${esc(img.alt||'Ảnh '+(i+1))}"><img src="${esc(img.src)}" alt="${esc(img.alt||'Ảnh '+(i+1))}" loading="lazy"><b>${chosen.includes(img.id)?'✓':'＋'}</b><span>${esc(img.name||img.alt||img.credit||'Ảnh tải lên')}</span></button><button type="button" class="image-delete" data-delete-image="${esc(img.id)}" aria-label="Xoá ảnh ${esc(img.name||img.alt||'Ảnh '+(i+1))}" title="Xoá khỏi thư viện và mọi cảnh">× Xoá</button></div>`).join('');
  $('image-library').querySelectorAll('[data-image]').forEach(el=>el.onclick=()=>toggleImage(el.dataset.image));
  $('image-library').querySelectorAll('[data-delete-image]').forEach(el=>el.onclick=()=>deleteImage(el.dataset.deleteImage));
  $('undo-image-delete').hidden=!state.removedImages.length;
}
const undoImageButton=document.createElement('button');
undoImageButton.id='undo-image-delete';undoImageButton.type='button';undoImageButton.className='quiet image-undo';undoImageButton.textContent='↶ Hoàn tác xoá ảnh';undoImageButton.hidden=true;
$('image-library').after(undoImageButton);
function refreshImageLibrary(){renderArticle();renderScenes();renderSummary();updatePreview();save();}
function deleteImage(id){
  const index=state.images.findIndex(img=>img.id===id);if(index<0)return;
  const placements=state.scenes.filter(scene=>scene.imageIds.includes(id)).map(scene=>({sceneId:scene.id,index:scene.imageIds.indexOf(id)}));
  state.removedImages.push({image:state.images[index],index,placements});
  state.images.splice(index,1);
  state.scenes.forEach(scene=>scene.imageIds=scene.imageIds.filter(imageId=>imageId!==id));
  refreshImageLibrary();
  const buttons=$('image-library').querySelectorAll('[data-delete-image]');
  (buttons[Math.min(index,buttons.length-1)]||undoImageButton).focus({preventScroll:true});
}
undoImageButton.onclick=()=>{
  const removed=state.removedImages.at(-1);if(!removed)return;
  if(state.images.length>=30)return notice('Thư viện đã đủ 30 ảnh. Xoá bớt ảnh trước khi khôi phục.',true);
  state.removedImages.pop();state.images.splice(Math.min(removed.index,state.images.length),0,removed.image);
  let skipped=false;
  removed.placements.forEach(({sceneId,index})=>{const scene=state.scenes.find(scene=>scene.id===sceneId);if(!scene||scene.imageIds.includes(removed.image.id))return;if(scene.imageIds.length>=6){skipped=true;return;}scene.imageIds.splice(Math.min(index,scene.imageIds.length),0,removed.image.id);});
  refreshImageLibrary();
  if(skipped)notice('Đã khôi phục ảnh vào thư viện. Cảnh đã đủ 6 ảnh nên cần chọn lại ảnh thủ công.');
};
function toggleImage(id){const scene=state.scenes[state.selected];if(!scene)return notice('Tạo kịch bản trước để gán ảnh cho từng cảnh.');if(scene.imageIds.includes(id))scene.imageIds=scene.imageIds.filter(x=>x!==id);else if(scene.imageIds.length>=6)return notice('Mỗi cảnh tối đa 6 ảnh. Bỏ bớt một ảnh trước khi chọn thêm.',true);else scene.imageIds.push(id);renderScenes();updatePreview();scheduleSave();}
async function upload(file){if(file.size>20*1024*1024)throw new Error(`${file.name} vượt quá 20 MB.`);const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});const extension=file.name.split('.').pop().toLowerCase();const mime=file.type||({wav:'audio/wav',mp3:'audio/mpeg',m4a:'audio/mp4',ogg:'audio/ogg'}[extension]);return api('/api/upload',{name:file.name,mime,data});}
$('image-upload').onchange=action(async()=>{for(const file of $('image-upload').files){if(state.images.length>=30)throw new Error('Thư viện hỗ trợ tối đa 30 ảnh.');const img=await upload(file);state.images.push({...img,alt:file.name.slice(0,180),credit:'Ảnh bổ sung'});renderImages();save();}$('image-upload').value='';notice('Đã thêm ảnh vào thư viện. Chọn ảnh để gán cho cảnh.');});
$('reference-upload').onchange=action(async()=>{const file=$('reference-upload').files[0];if(!file)return;state.reference=await upload(file);renderReference();invalidateVoice();save();});
function renderReference(){if(state.reference){$('reference-name').textContent=state.reference.name;$('reference-player').src=state.reference.src;$('reference-player').hidden=false;}}
function setVoiceMode(mode){state.mode=mode;$('mode-design').setAttribute('aria-pressed',String(mode==='design'));$('mode-clone').setAttribute('aria-pressed',String(mode==='clone'));$('clone-fields').hidden=mode!=='clone';$('design-fields').hidden=mode!=='design';$('instruct-field').hidden=mode!=='clone';$('voice-mode-help').textContent=mode==='design'?'Tạo một giọng mới theo đặc điểm bạn chọn, dùng xuyên suốt video.':'Dùng audio mẫu để giữ cùng một giọng cho tất cả các cảnh.';scheduleSave();}
$('mode-design').onclick=()=>{setVoiceMode('design');invalidateVoice();};$('mode-clone').onclick=()=>{setVoiceMode('clone');invalidateVoice();};
function invalidateVoice(){$('voice-player').hidden=true;state.previewJob=null;state.voicePreview=null;$('voice-preview-note').textContent='Cài đặt giọng đã thay đổi. Tạo lại bản nghe thử để kiểm tra.';scheduleSave();}
function getVoice(){
  const steps=Number($('voice-steps').value),guidance=Number($('voice-guidance').value),duration=$('voice-duration').value?Number($('voice-duration').value):null;
  if(!Number.isInteger(steps)||steps<4||steps>64)throw new Error('Inference steps phải là số nguyên từ 4 đến 64.');
  if(!Number.isFinite(guidance)||guidance<0||guidance>4)throw new Error('CFG phải từ 0 đến 4.');
  if(duration!==null&&(!Number.isFinite(duration)||duration<=0||duration>120))throw new Error('Thời lượng mỗi đoạn phải từ 1 đến 120 giây hoặc để trống.');
  if(state.mode==='clone'&&!state.reference)throw new Error('Tải audio giọng mẫu trước khi dùng Voice Clone.');
  return {mode:state.mode,language:$('voice-language').value,speed:Number($('voice-speed').value),...(state.mode==='clone'?{referenceId:state.reference.id}:{}),referenceText:state.mode==='clone'?$('reference-text').value:'',settings:{instruct:state.mode==='clone'?$('voice-instruct').value:'',steps,guidance,duration,denoise:$('voice-denoise').checked,preprocess:$('voice-preprocess').checked,postprocess:$('voice-postprocess').checked,...Object.fromEntries(designKeys.map(key=>[key,state.mode==='design'?($('design-'+key)?.value||'Auto'):'Auto']))}};
}
$('preview-voice').onclick=action(async()=>{if(!$('preview-text').value.trim())throw new Error('Nhập nội dung nghe thử.');await launch('voice','/api/voice',{voice:getVoice(),text:$('preview-text').value.trim()});});
const labels={gender:'Giới tính',age:'Độ tuổi',pitch:'Cao độ',style:'Phong cách',accent:'Giọng tiếng Anh',dialect:'Phương ngữ tiếng Trung'};
function renderDesignOptions(parameters){$('design-fields').innerHTML=designKeys.map((key,i)=>{const param=parameters?.design?.find(p=>p.name==='param_'+(i+9));const choices=param?.choices||['Auto'];return `<div><label for="design-${key}">${labels[key]}</label><select id="design-${key}">${choices.map(c=>`<option value="${esc(c)}">${esc(c==='Auto'?'Tự động':c.split(' / ')[0])}</option>`).join('')}</select></div>`;}).join('');designKeys.forEach(key=>{const el=$('design-'+key);if(state.fields[el.id]&&[...el.options].some(o=>o.value===state.fields[el.id]))el.value=state.fields[el.id];el.onchange=invalidateVoice;});}
function renderSummary(){const words=state.scenes.reduce((n,s)=>n+s.voiceText.split(/\s+/).filter(Boolean).length,0);const imageCount=new Set(state.scenes.flatMap(s=>s.imageIds)).size;$('render-summary').innerHTML=`<h3>${esc(state.title||'Chưa có kịch bản')}</h3><div class="summary-line"><span>Nội dung</span><strong>${state.scenes.length} cảnh · ${words} từ</strong></div><div class="summary-line"><span>Hình ảnh sử dụng</span><strong>${imageCount} ảnh</strong></div><div class="summary-line"><span>Giọng đọc</span><strong>${state.mode==='clone'?'Voice Clone':'Voice Design'} · ${$('voice-language').value==='Vietnamese'?'Tiếng Việt':'English'}</strong></div><div class="summary-line"><span>Bản nghe thử</span><strong>${state.previewJob?'Sẽ dùng lại giọng đã nghe':'Chưa tạo'}</strong></div>`;}
$('render-video').onclick=action(async()=>{
  if(state.scenes.length<3){setStep(1);throw new Error('Tạo kịch bản trước khi xuất video.');}
  if(!state.title.trim()||state.scenes.some(s=>!s.headline.trim()||!s.voiceText.trim())){setStep(2);throw new Error('Tiêu đề và lời đọc của tất cả các cảnh không được để trống.');}
  if(!$('channel').value.trim())throw new Error('Nhập tên kênh.');
  const missing=state.scenes.findIndex(s=>templateInfo(effectiveTemplate(s))?.images && !s.imageIds.length);if(missing>=0){state.selected=missing;setStep(2);throw new Error(`Cảnh ${missing+1} chưa có ảnh. Chọn ít nhất một ảnh cho cảnh này.`);}
  const voice=getVoice();const script={version:'1.0',renderer:'hyperframes',metadata:{title:state.title,channel:$('channel').value,source:{url:state.article?.url||'',domain:state.article?.domain||'local',image:null},...(state.article?.publishedAt?{publishedAt:state.article.publishedAt}:{})},voice:{provider:'omnivoice',language:voice.language,speed:voice.speed},aspect:$('video-aspect').value,scenes:state.scenes.map((s,i)=>({id:s.id,type:i===0?'hook':i===state.scenes.length-1?'outro':'body',voiceText:s.voiceText,templateId:effectiveTemplate(s),inputs:{headline:s.headline,summary:s.summary,theme:$('video-theme').value,studioFields:s.templateFields?.[effectiveTemplate(s)]||{}}}))};
  const sceneImages=state.scenes.map(s=>s.imageIds.map(id=>{const img=state.images.find(x=>x.id===id);return {id,alt:img?.alt||'',credit:img?.credit||''};}));
  $('render-result').hidden=true;await launch('render','/api/render',{script,voice,sceneImages,...(state.previewJob?{previewJobId:state.previewJob}:{})});
});
function resultHtml(result){return `<video src="${esc(result.video)}" controls preload="metadata"></video><div class="downloads"><a href="${esc(result.video)}" download>↓ Video MP4</a><a href="${esc(result.audio)}" download>↓ Giọng MP3</a><a href="${esc(result.script)}" download>↓ Lời đọc TXT</a><a href="${esc(result.json)}" download>↓ Kịch bản JSON</a></div>`;}
function showResult(result){$('render-result').innerHTML=resultHtml(result);$('render-result').hidden=false;}
async function paintPreview(){
  if(!templateCatalog.length)return;
  const revision=++previewRevision;const aspect=$('video-aspect').value;
  const scene=state.scenes[state.selected];const english=$('voice-language').value==='English';
  const v={theme:$('video-theme').value,locale:english?'en':'vi',headline:scene?.headline||(english?'Your next story starts here':'Câu chuyện tiếp theo bắt đầu từ đây'),summary:scene?.summary||(english?'Add an article to build your video.':'Thêm bài viết để đưa nội dung, hình ảnh và giọng đọc lên khuôn hình.'),channel:$('channel').value||'BẢN TIN',category:english?'News':'Thời sự',source:state.article?.domain||'',date:state.article?.publishedAt||'',section:scene?`${english?'Scene':'Cảnh'} ${state.selected+1} / ${state.scenes.length}`:'NEWSROOM STUDIO',images:scene?scene.imageIds.map(id=>state.images.find(x=>x.id===id)).filter(Boolean).map(img=>({src:location.origin+img.src,alt:img.alt||'',credit:img.credit||''})):[]};
  const templateId=effectiveTemplate(scene),info=templateInfo(templateId);
  $('template-hint').textContent=info.description+(info.images?'':' Mẫu này dùng chữ / đồ họa, không hiển thị ảnh.');
  const {images:unused,category:unusedCategory,...seed}=v;
  try {
    const result=await api('/api/template-preview',{templateId,aspect,seed,values:scene?.templateFields?.[templateId]||{},images:(scene?.imageIds||[]).map(id=>{const image=state.images.find(img=>img.id===id);return{id,alt:image?.alt||'',credit:image?.credit||''};})});
    if(revision!==previewRevision)return;
    $('scene-preview').srcdoc=result.html;previewDimensions={width:result.width,height:result.height};
    $('preview-aspect').textContent=aspect;$('preview-scene-name').textContent=(state.step===1&&articleSourceChanged()&&scene?'Bản nháp trước · ':'')+(scene?`Cảnh ${state.selected+1} · ${info.name}`:info.name);
    fillTemplateFields(scene,info,result.values);resizePreview();
  }catch(error){if(revision===previewRevision){$('template-hint').textContent=error.message;$('scene-preview').srcdoc='<p style="font:36px Arial;padding:50px">'+esc(error.message)+'</p>';}}
}
function updatePreview(){clearTimeout(previewTimer);previewTimer=setTimeout(()=>paintPreview().catch(()=>{}),180);}
function resizePreview(){const aspect=$('video-aspect').value,w=previewDimensions?.width||(aspect==='16:9'?1920:1080),h=previewDimensions?.height||(aspect==='9:16'?1920:1080);const available=$('preview-stage').clientWidth-28;const scale=Math.min(available/w,470/h);$('preview-viewport').style.width=w*scale+'px';$('preview-viewport').style.height=h*scale+'px';$('scene-preview').style.width=w+'px';$('scene-preview').style.height=h+'px';$('scene-preview').style.transform=`scale(${scale})`;}
window.addEventListener('resize',resizePreview);
for(const [id,direction] of [['previous-scene',-1],['next-scene',1]])$(id).onclick=()=>{if(!state.scenes.length)return;state.selected=(state.selected+direction+state.scenes.length)%state.scenes.length;renderScenes();updatePreview();scheduleSave();};
fieldIds.forEach(id=>{const el=$(id);if(state.fields[id]!==undefined){if(el.type==='checkbox')el.checked=state.fields[id];else el.value=state.fields[id];}el.addEventListener('input',()=>{scheduleSave();if(id.startsWith('voice-')||id==='reference-text')invalidateVoice();if(id==='voice-speed')$('speed-value').textContent=Number(el.value).toFixed(2)+'×';if(id==='voice-language')$('script-language').value=el.value;if(id==='script-language'){$('voice-language').value=el.value;invalidateVoice();}if(['video-aspect','video-theme','channel','voice-language','script-language'].includes(id))updatePreview();});});
function showEditor(){ $('editor-view').hidden=false;$('history-view').hidden=true;$('nav-editor').classList.add('active');$('nav-history').classList.remove('active');updatePreview();}
$('nav-editor').onclick=showEditor;
$('nav-history').onclick=action(async()=>{const jobs=await api('/api/jobs');$('editor-view').hidden=true;$('history-view').hidden=false;$('nav-history').classList.add('active');$('nav-editor').classList.remove('active');const renders=jobs.filter(j=>j.kind==='render');$('history-list').innerHTML=renders.length?renders.map(job=>`<article class="history-item"><h3>${esc(job.result?.title||'Bản tin đang xử lý')}</h3><p>${esc(new Date(job.createdAt).toLocaleString('vi-VN'))} · ${job.status==='done'?'Hoàn tất':job.status==='error'?'Chưa hoàn tất':'Đang chạy'}</p>${job.result?resultHtml(job.result):`<p>${esc(job.error||job.message)}</p>`}</article>`).join(''):'<div class="empty-state"><span>▷</span><h3>Chưa có video nào</h3><p>Video hoàn tất sẽ xuất hiện tại đây.</p></div>';});
$('mobile-editor').onclick=showEditor;
$('mobile-history').onclick=$('nav-history').onclick;
$('open-settings').onclick=()=>{$('settings-message').textContent='';$('settings-dialog').showModal();};$('close-settings').onclick=()=>$('settings-dialog').close();
function providerChange(){$('api-fields').hidden=$('ai-provider').value!=='api';$('codex-help').hidden=$('ai-provider').value!=='codex';}
$('ai-provider').onchange=providerChange;
$('settings-form').onsubmit=async event=>{event.preventDefault();try{const body={provider:$('ai-provider').value,baseUrl:$('ai-base-url').value.trim(),model:$('ai-model').value.trim(),clearKey:$('clear-key').checked,...($('ai-key').value?{apiKey:$('ai-key').value}:{})};if(body.provider==='api'&&!body.model)throw new Error('Nhập tên model để dùng API.');await api('/api/settings',body);$('ai-key').value='';$('clear-key').checked=false;$('settings-dialog').close();await refreshStatus();notice('Đã lưu cấu hình AI.');}catch(error){$('settings-message').textContent=error.message;}};
async function refreshStatus(){
  try{status=await api('/api/status');$('service-status').textContent=status.omni.connected?'OmniVoice đã kết nối':'OmniVoice chưa kết nối';$('service-status').classList.toggle('offline',!status.omni.connected);renderDesignOptions(status.omni.parameters);$('ai-provider').value=status.ai.provider;$('ai-base-url').value=status.ai.baseUrl;$('ai-model').value=status.ai.model;$('ai-key').placeholder=status.ai.hasKey?'Đã lưu key · Để trống để giữ nguyên':'Nhập API key';providerChange();$('ai-note').textContent=status.ai.provider==='codex'?'Sử dụng Codex đang đăng nhập · Bạn có thể chỉnh sửa bản nháp.':`Sử dụng API · ${status.ai.model||'Chưa chọn model'}`;if(!status.ffmpeg)notice('Chưa tìm thấy FFmpeg. Bạn vẫn có thể chuẩn bị kịch bản, ảnh và nghe thử; cần FFmpeg để xuất video.',true);}catch{ $('service-status').textContent='Máy chủ chưa kết nối';$('service-status').classList.add('offline'); }
}
function templateInfo(id){return templateCatalog.find(t=>t.id===id);}
function effectiveTemplate(scene){return scene?.templateId||state.templateId||'frame-news';}
function templateOptions(id,inherit=false){return (inherit?`<option value="" ${!id?'selected':''}>Theo mẫu mặc định</option>`:'')+templateCatalog.map(t=>`<option value="${t.id}" ${t.id===id?'selected':''}>${esc(t.name)}</option>`).join('');}
function syncAspect(){
  const ids=state.scenes.length?state.scenes.map(effectiveTemplate):[state.templateId];
  const supported=['9:16','16:9','1:1'].filter(aspect=>ids.every(id=>templateInfo(id)?.aspects.includes(aspect)));
  for(const option of $('video-aspect').options)option.disabled=!supported.includes(option.value);
  if(!supported.includes($('video-aspect').value)){$('video-aspect').value='9:16';notice('Các mẫu đã chọn hỗ trợ 9:16 và 16:9. Đã chuyển khung hình sang 9:16.');}
  $('video-theme').disabled=!ids.includes('frame-news');
}
function chooseTemplate(id,all=false){
  state.templateId=id;$('video-template').value=id;
  if(all)state.scenes.forEach(scene=>delete scene.templateId);
  templateEditorKey='';syncAspect();renderScenes();scheduleSave();updatePreview();
  if(state.scenes.some(scene=>scene.templateId)&&!all)notice('Đã đổi mẫu mặc định. Cảnh có mẫu riêng được giữ nguyên; dùng “Áp dụng mọi cảnh” để đổi toàn bộ.');
}
function wireTemplateEditors(){
  templateEditorKey='';
  $('scenes').querySelectorAll('[data-scene-template]').forEach(el=>{el.value=state.scenes[Number(el.dataset.sceneTemplate)].templateId||'';el.onchange=()=>{const scene=state.scenes[Number(el.dataset.sceneTemplate)];if(el.value)scene.templateId=el.value;else delete scene.templateId;syncAspect();renderScenes();updatePreview();scheduleSave();};});
  $('scenes').querySelectorAll('[data-reset-template]').forEach(el=>el.onclick=()=>{const scene=state.scenes[Number(el.dataset.resetTemplate)];if(scene.templateFields)delete scene.templateFields[effectiveTemplate(scene)];templateEditorKey='';updatePreview();scheduleSave();});
}
function fillTemplateFields(scene,info,values){
  const container=$('scene-template-fields-'+state.selected);if(!scene||!container)return;
  const key=scene.id+info.id;
  if(templateEditorKey!==key){
    container.innerHTML=info.fields.map(field=>`<label for="tpl-${field.key}">${esc(field.label)}${field.required?' *':''}<span class="optional">${field.max} ký tự${field.lines?' / dòng · tối đa '+field.lines+' dòng':''}</span></label>${field.lines?`<textarea id="tpl-${field.key}" data-template-field="${field.key}" rows="${Math.min(field.lines,4)}"></textarea>`:`<input id="tpl-${field.key}" data-template-field="${field.key}" maxlength="${field.max}">`}`).join('');
    container.querySelectorAll('[data-template-field]').forEach(el=>el.oninput=()=>{scene.templateFields??={};scene.templateFields[info.id]??={};scene.templateFields[info.id][el.dataset.templateField]=el.value;updatePreview();scheduleSave();});templateEditorKey=key;
  }
  container.querySelectorAll('[data-template-field]').forEach(el=>{if(document.activeElement!==el)el.value=values[el.dataset.templateField]||'';});
}
async function loadTemplates(){
  templateCatalog=await api('/api/templates');if(!templateInfo(state.templateId))state.templateId='frame-news';
  $('video-template').innerHTML=templateOptions(state.templateId);$('video-template').onchange=()=>chooseTemplate($('video-template').value);
  $('apply-template-all').onclick=()=>chooseTemplate($('video-template').value,true);
  $('template-gallery').innerHTML=templateCatalog.map(t=>`<button class="template-card" data-template-pick="${t.id}"><span class="template-swatch" style="--swatch:${t.color}">${esc(t.mark)}</span><strong>${esc(t.name)}</strong><span>${esc(t.description)}</span><small>${t.aspects.join(' · ')} / ${t.images?'Có ảnh':'Chữ & đồ họa'}</small></button>`).join('');
  $('template-gallery').querySelectorAll('[data-template-pick]').forEach(el=>el.onclick=()=>{chooseTemplate(el.dataset.templatePick);$('templates-dialog').close();showEditor();});
  ['nav-templates','mobile-templates','browse-templates'].forEach(id=>$(id).onclick=()=>$('templates-dialog').showModal());
  $('close-templates').onclick=()=>$('templates-dialog').close();syncAspect();renderScenes();updatePreview();
}
window.addEventListener('beforeunload',save);
renderDesignOptions();renderArticle();renderReference();setVoiceMode(state.mode);$('speed-value').textContent=Number($('voice-speed').value).toFixed(2)+'×';renderScenes();setStep(state.step);
if(state.voicePreview){$('voice-player').src=state.voicePreview.src;$('voice-player').hidden=false;}
await refreshStatus();
try{await loadTemplates();}catch(error){notice('Không tải được bộ template. '+error.message,true);}
initialized = true;
for(const job of [...state.activeJobs])void watchJob(job.id,job.kind);
