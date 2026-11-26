// @vitest-environment jsdom
import {act,createRef} from 'react';import {createRoot} from 'react-dom/client';import {afterEach,expect,it} from 'vitest';
import SessionRecovery,{recoveryKey} from '../apps/admin/components/session-recovery';
(globalThis as {IS_REACT_ACT_ENVIRONMENT?:boolean}).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(()=>{sessionStorage.clear();});
// Browser recovery was withdrawn in 0eef5db ("remove browser recovery to reduce form height").
// The component stays as an inert stub so existing call sites compile; it must never write drafts.
it('browser recovery is inert: no controls and nothing written to browser storage',async()=>{
 const host=document.createElement('div');document.body.append(host);const root=createRoot(host);const ref=createRef<HTMLFormElement>();
 await act(async()=>root.render(<form ref={ref}><SessionRecovery form={ref} actor="one" article="article" revision="1"/><input name="title" defaultValue="server title"/></form>));
 expect(host.querySelectorAll('button')).toHaveLength(0);
 expect(host.textContent).not.toMatch(/Enable browser recovery|Restore recovery copy/);
 const title=host.querySelector<HTMLInputElement>('[name=title]')!;
 await act(async()=>{title.value='private draft';title.dispatchEvent(new Event('input',{bubbles:true}));});
 expect(sessionStorage.length).toBe(0);expect(title.value).toBe('private draft');
 expect(recoveryKey('one','article')).toBe('');
 await act(async()=>root.unmount());host.remove();
});
