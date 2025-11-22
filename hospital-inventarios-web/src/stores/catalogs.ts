import { defineStore } from 'pinia';
import axios from 'axios';
const API = '/api';
export const useCatalogs = defineStore('catalogs',{ state:()=>({ estados: [] as any[], ubicaciones: [] as any[] }), actions:{
  async loadEstados(){ const {data} = await axios.get(API+'/estados-fisicos'); this.estados = data; },
  async loadUbicaciones(){ const {data} = await axios.get(API+'/ubicaciones'); this.ubicaciones = data; }
}});
