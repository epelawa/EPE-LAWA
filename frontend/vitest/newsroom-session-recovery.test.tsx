// @vitest-environment jsdom
import {act,createRef} from 'react';import {createRoot} from 'react-dom/client';import {afterEach,expect,it,vi} from 'vitest';
import SessionRecovery,{recoveryKey} from '../apps/admin/components/session-recovery';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{sessionStorage.clear();vi.useRealTimers();});
function click(el:HTMLElement,text:string){const b=Array.from(el.querySelectorAll('button')).find(b=>b.textContent?.includes(text));if(!b)throw Error(text);b.click();}
function value(el:HTMLInputElement,v:string){Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!.call(el,v);el.dispatchEvent(new Event('input',{bubbles:true}));}
it('opt-in snapshot survives refresh, needs explicit restore and is scoped to actor',async()=>{
 vi.useFakeTimers();const host=document.createElement('div');document.body.append(host);let root=createRoot(host);const ref=createRef<HTMLFormElement>();
 const render=(actor='one',revision='1')=><form ref={ref}><SessionRecovery form={ref} actor={actor} article="article" revision={revision}/><input name="title" defaultValue="server title"/><input name="revision" value={revision} readOnly/></form>;
 await act(async()=>root.render(render()));await act(async()=>click(host,'Enable browser recovery'));
 await act(async()=>{value(host.querySelector('[name=title]')!,'private draft');vi.advanceTimersByTime(600);});
 expect(sessionStorage.getItem(recoveryKey('one','article'))).toContain('private draft');expect(sessionStorage.getItem(recoveryKey('one','article'))).not.toContain('"revision":"1","title"');
 await act(async()=>root.unmount());root=createRoot(host);await act(async()=>root.render(render('one','2')));expect(host.textContent).toContain('revision has changed');expect((host.querySelector('[name=title]') as HTMLInputElement).value).toBe('server title');
 await act(async()=>click(host,'Restore recovery copy'));expect((host.querySelector('[name=title]') as HTMLInputElement).value).toBe('private draft');expect((host.querySelector('[name=revision]') as HTMLInputElement).value).toBe('2');
 await act(async()=>click(host,'Stop recovery and remove copy'));expect(sessionStorage.getItem(recoveryKey('one','article'))).toBeNull();
 await act(async()=>root.unmount());root=createRoot(host);await act(async()=>root.render(render('two')));expect(host.textContent).not.toContain('Restore recovery copy');await act(async()=>root.unmount());host.remove();
});
it('expired snapshots are removed rather than restored',async()=>{
 const key=recoveryKey('one','article');sessionStorage.setItem(key,JSON.stringify({version:1,savedAt:Date.now()-86400001,revision:'1',fields:{title:'old'}}));
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const ref=createRef<HTMLFormElement>();await act(async()=>root.render(<form ref={ref}><SessionRecovery form={ref} actor="one" article="article" revision="1" /></form>));
 expect(sessionStorage.getItem(key)).toBeNull();expect(host.textContent).not.toContain('Restore recovery copy');await act(async()=>root.unmount());host.remove();
});
