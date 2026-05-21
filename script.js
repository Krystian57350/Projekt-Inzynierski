// Prosty Menadżer subskrypcji — localStorage
const STORAGE_KEY = 'subscriptions_v1'
const CATEGORIES_KEY = 'subscription_categories_v1'
const DEFAULT_CATEGORIES = ['Wideo','Muzyka','Aplikacje']
let subs = []
let categories = []

// DOM
const el = id => document.getElementById(id)
const tbody = document.querySelector('#subsTable tbody')
const form = el('subForm')
const totalEl = el('total')

function load(){
  try{subs = JSON.parse(localStorage.getItem(STORAGE_KEY))||[];}catch(e){subs=[]}
}
function save(){localStorage.setItem(STORAGE_KEY, JSON.stringify(subs))}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,8)}

function formatCurrency(n){return new Intl.NumberFormat('pl-PL',{style:'currency',currency:'PLN'}).format(n)}
function toMonthly(cost, period){return period==='yearly'?cost/12:cost}

function loadCategories(){
  try{categories = JSON.parse(localStorage.getItem(CATEGORIES_KEY))||[]}catch(e){categories=[]}
  if(!Array.isArray(categories)) categories=[]
  if(categories.length===0){categories = DEFAULT_CATEGORIES.slice(); saveCategories()}
}
function saveCategories(){localStorage.setItem(CATEGORIES_KEY, JSON.stringify(categories))}
function populateCategoryOptions(){
  const select = el('category')
  if(!select) return
  select.innerHTML = `<option value="">Brak</option>${categories.map(c=>`<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('')}`
}
function openCategoryModal(){
  const modal = el('categoryModal')
  const input = el('newCategoryName')
  modal.classList.remove('hidden')
  input.value = ''
  setTimeout(()=>input.focus(), 0)
}
function closeCategoryModal(){
  el('categoryModal').classList.add('hidden')
}
function saveNewCategory(){
  const name = el('newCategoryName').value.trim()
  if(!name){alert('Nazwa kategorii nie może być pusta.'); return}
  if(categories.includes(name)){alert('Ta kategoria już istnieje.'); return}
  categories.push(name)
  saveCategories()
  populateCategoryOptions()
  el('category').value = name
  closeCategoryModal()
}

function initDatepicker(){
  if(typeof flatpickr === 'undefined') return
  flatpickr(el('nextDate'), {
    dateFormat: 'Y-m-d',
    locale: 'pl',
    allowInput: true,
    disableMobile: true
  })
}

function render(){
  const search = el('search').value.toLowerCase()
  const filter = el('filter').value
  const sort = el('sort').value

  let list = subs.slice()
  if(filter==='active') list = list.filter(s=>s.active)
  if(filter==='inactive') list = list.filter(s=>!s.active)
  if(search) list = list.filter(s=> (s.name+s.category+s.note).toLowerCase().includes(search))

  if(sort==='costDesc') list.sort((a,b)=>b.cost-a.cost)
  else if(sort==='costAsc') list.sort((a,b)=>a.cost-b.cost)
  else if(sort==='dateAsc') list.sort((a,b)=> (a.nextDate||'').localeCompare(b.nextDate||''))
  else if(sort==='dateDesc') list.sort((a,b)=> (b.nextDate||'').localeCompare(a.nextDate||''))
  else list.sort((a,b)=>b.added-a.added)

  tbody.innerHTML=''
  list.forEach(s=>{
    const tr = document.createElement('tr')
    tr.innerHTML = `
      <td>${escapeHtml(s.name)}</td>
      <td>${formatCurrency(s.cost)}</td>
      <td>${s.period==='monthly'?'Miesięczny':'Roczny'}</td>
      <td>${s.nextDate||'-'}</td>
      <td>${escapeHtml(s.category||'-')}</td>
      <td>${escapeHtml(s.note||'-')}</td>
      <td>${s.active? 'Tak' : 'Nie'}</td>
      <td>
        <button class="btn edit" data-id="${s.id}">Edytuj</button>
        <button class="btn delete" data-id="${s.id}">Usuń</button>
        <button class="btn toggle" data-id="${s.id}">${s.active? 'Dezaktywuj' : 'Aktywuj'}</button>
      </td>
    `
    tbody.appendChild(tr)
  })

  // total monthly
  const total = subs.reduce((acc,s)=> acc + (s.active? toMonthly(s.cost,s.period):0), 0)
  totalEl.textContent = formatCurrency(total)
}

function escapeHtml(str){return String(str||'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"})[c])}

function addOrUpdateFromForm(e){
  e.preventDefault()
  const id = el('subId').value
  const name = el('name').value.trim()
  const cost = parseFloat(el('cost').value)
  const period = el('period').value
  const nextDate = el('nextDate').value || null
  const category = el('category').value.trim()
  const note = el('note').value.trim()
  const active = el('active').checked

  if(!name || isNaN(cost) || cost<0){alert('Proszę podać poprawną nazwę i koszt.');return}

  if(id){
    const idx = subs.findIndex(s=>s.id===id)
    if(idx>-1){
      subs[idx] = {...subs[idx],name,cost,period,nextDate,category,note,active}
    }
  }else{
    subs.push({id:uid(),name,cost,period,nextDate,category,note,active,added:Date.now()})
  }
  save(); render(); form.reset(); el('subId').value=''
}

function handleTableClick(e){
  const id = e.target.dataset.id
  if(!id) return
  if(e.target.classList.contains('edit')){
    const s = subs.find(x=>x.id===id); if(!s) return
    el('subId').value = s.id
    el('name').value = s.name
    el('cost').value = s.cost
    el('period').value = s.period
    el('nextDate').value = s.nextDate || ''
    el('category').value = s.category || ''
    el('note').value = s.note || ''
    el('active').checked = !!s.active
    window.scrollTo({top:0,behavior:'smooth'})
  }else if(e.target.classList.contains('delete')){
    if(confirm('Usuń tę subskrypcję?')){
      subs = subs.filter(x=>x.id!==id); save(); render();
    }
  }else if(e.target.classList.contains('toggle')){
    const s = subs.find(x=>x.id===id); if(!s) return
    s.active = !s.active; save(); render();
  }
}

function exportJSON(){
  const data = JSON.stringify(subs, null, 2)
  const blob = new Blob([data],{type:'application/json'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = 'subscriptions.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url)
}

function importJSON(file){
  const reader = new FileReader()
  reader.onload = ()=>{
    try{
      const imported = JSON.parse(reader.result)
      if(!Array.isArray(imported)) throw 0
      const categorySet = new Set(categories)
      // normalize items
      imported.forEach(item=>{
        if(!item.id) item.id = uid()
        if(!item.added) item.added = Date.now()
        if(item.category) categorySet.add(item.category)
      })
      categories = Array.from(categorySet)
      saveCategories()
      subs = imported; save(); populateCategoryOptions(); render();
      alert('Import zakończony.');
    }catch(e){alert('Błąd importu: niepoprawny plik JSON.')}
  }
  reader.readAsText(file)
}

// events
form.addEventListener('submit', addOrUpdateFromForm)
el('clearBtn').addEventListener('click', ()=>{form.reset(); el('subId').value='';})
tbody.addEventListener('click', handleTableClick)
el('search').addEventListener('input', render)
el('filter').addEventListener('change', render)
el('sort').addEventListener('change', render)
el('exportBtn').addEventListener('click', exportJSON)
el('importFile').addEventListener('change', e=>{ if(e.target.files[0]) importJSON(e.target.files[0]); e.target.value='' })
el('clearAllBtn').addEventListener('click', ()=>{ if(confirm('Usunąć wszystkie subskrypcje?')){ subs=[]; save(); render(); } })
el('addCategoryBtn').addEventListener('click', openCategoryModal)
el('saveCategoryBtn').addEventListener('click', saveNewCategory)
el('cancelCategoryBtn').addEventListener('click', closeCategoryModal)

document.addEventListener('keydown', e=>{
  if(e.key==='Escape' && !el('categoryModal').classList.contains('hidden')) closeCategoryModal()
})
el('categoryModal').addEventListener('click', e=>{
  if(e.target.id==='categoryModal') closeCategoryModal()
})

// init
load(); loadCategories(); populateCategoryOptions(); initDatepicker(); render();
