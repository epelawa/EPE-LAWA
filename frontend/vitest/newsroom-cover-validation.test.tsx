// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it} from 'vitest';
import NewsCoverUrlFields from '../apps/admin/components/news-cover-url-fields';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
function change(el: HTMLInputElement,value:string) {
 Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,value);
 el.dispatchEvent(new Event('input',{bubbles:true}));
}
it('rejects unsafe cover links and required credit fields without discarding data',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(<form><NewsCoverUrlFields idPrefix="test" /></form>));
 const url=host.querySelector<HTMLInputElement>('[name=coverUrl]')!,source=host.querySelector<HTMLInputElement>('[name=coverSourceUrl]')!,license=host.querySelector<HTMLInputElement>('[name=coverLicenseUrl]')!;
 await act(async()=>{change(url,'https://images.example.com/photo.jpg');});expect(url.validity.valid).toBe(true);
 await act(async()=>{change(source,'http://example.com/source');change(license,'https://creativecommons.org/licenses/by/4.0/');});expect(source.validity.valid).toBe(false);expect(license.validity.valid).toBe(true);
 await act(async()=>change(source,'https://example.com/source'));expect(source.validity.valid).toBe(true);
 await act(async()=>change(url,'https://127.0.0.1/private'));expect(url.validity.valid).toBe(false);
 await act(async()=>change(url,''));expect(source.validationMessage).toBe('');expect(source.value).toBe('https://example.com/source');
 await act(async()=>root.unmount());host.remove();
});
