// @vitest-environment jsdom
import {act} from 'react';
import {createRoot} from 'react-dom/client';
import {expect,it} from 'vitest';
import NewsCoverUrlFields from '../apps/admin/components/news-cover-url-fields';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
function change(el: HTMLInputElement,value:string) {
 // Use the element's own window prototype so the native setter matches the jsdom realm.
 const proto=Object.getPrototypeOf(el) as HTMLInputElement;
 Object.getOwnPropertyDescriptor(proto,'value')!.set!.call(el,value);
 el.dispatchEvent(new Event('input',{bubbles:true}));
}
// Cover credit, source and licence fields were removed from the composer in 1a1b7c9
// ("Remove unnecessary fields from article cover upload"); the link itself is still validated.
it('rejects unsafe cover links without discarding the typed value',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);
 await act(async()=>root.render(<form><NewsCoverUrlFields idPrefix="test" /></form>));
 const url=host.querySelector<HTMLInputElement>('[name=coverUrl]')!;
 expect(host.querySelector('[name=coverSourceUrl]')).toBeNull();expect(host.querySelector('[name=coverLicenseUrl]')).toBeNull();
 expect(host.querySelector('[name=coverAlt]')).not.toBeNull();
 await act(async()=>{change(url,'https://images.example.com/photo.jpg');});expect(url.validity.valid).toBe(true);
 await act(async()=>change(url,'https://127.0.0.1/private'));expect(url.validity.valid).toBe(false);expect(url.value).toBe('https://127.0.0.1/private');
 await act(async()=>change(url,'http://images.example.com/photo.jpg'));expect(url.validity.valid).toBe(false);
 await act(async()=>change(url,''));expect(url.validity.valid).toBe(true);expect(url.validationMessage).toBe('');
 await act(async()=>root.unmount());host.remove();
});
