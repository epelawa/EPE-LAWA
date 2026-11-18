import {expect,it,vi} from 'vitest';
import {renderToStaticMarkup} from 'react-dom/server';
vi.mock('next/link',()=>({default:({children,href}:{children:React.ReactNode;href:string})=><a href={href}>{children}</a>}));
import {DashboardDiscoverNews} from '../apps/main/app/dashboard/news-content';
const story={id:'1',slug:'report',title:'Report',summary:'A unique summary',published_at:'2026-01-01T00:00:00Z',is_breaking:false,breaking_until:null,author_name:'Reporter',category_slug:'local',category_label:'Local',og_image_key:null,cover_url:null,cover_alt:null};
function fixture(failed=false){
 const rpc=vi.fn(()=>chain(failed?{data:null,error:{code:'failure'}}:{data:[story],error:null}));
 function chain(result:unknown){const obj:Record<string,unknown>={};for(const method of ['select','order','eq','limit','range','in'])obj[method]=()=>obj;obj.then=(resolve:(value:unknown)=>void)=>resolve(result);return obj;}
 return {rpc,from:(table:string)=>chain(table==='categories'?{data:[{slug:'local',label:'Local'}],error:null}:{data:[],error:null})};
}
it('passes summary or author search with category and page offset to published search',async()=>{
 const client=fixture();const html=renderToStaticMarkup(await DashboardDiscoverNews({client:client as never,query:'unique',category:'local',page:2}));
 expect(client.rpc).toHaveBeenCalledWith('search_published_news',{p_query:'unique',p_category:'local',p_offset:20});expect(html).toContain('Report');expect(html).toContain('Page 2');
});
it('reports search failures rather than empty results',async()=>{
 const client=fixture(true);const log=vi.spyOn(console,'error').mockImplementation(()=>{});const html=renderToStaticMarkup(await DashboardDiscoverNews({client:client as never,query:'unique',category:'',page:1}));
 expect(html).toContain('Discover stories could not be loaded');expect(html).not.toContain('No matching published stories');log.mockRestore();
});
