import { defineStore } from 'pinia';
import axios from 'axios';
const API = '/api';
export const useInventario = defineStore('inventario',{ state:()=>({ items:[] as any[], f:{ q:'', no_inventario:'', responsable:'', ubicacionId:'', tipo_bien:'', fecha_desde:'', fecha_hasta:'' } }), actions:{
  async load(){ const {data}=await axios.get(API+'/inventario',{params:this.f}); this.items = data.data ?? data; },
  async get(id:number){ const {data}=await axios.get(API+'/inventario/'+id); return data; },
  async save(p:any){ return p.id ? axios.put(API+'/inventario/'+p.id,p) : axios.post(API+'/inventario',p); },
  async remove(id:number){ return axios.delete(API+'/inventario/'+id); },
  pdfUrl(id:number){ return API+'/resguardo/'+id+'/pdf'; },
  exportUrl(){ const params = new URLSearchParams(this.f as any).toString(); return API+'/inventario/export.xlsx?'+params; }
}});
