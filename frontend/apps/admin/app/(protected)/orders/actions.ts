"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "../../../lib/supabase";
export async function advanceOrder(f:FormData):Promise<void>{const id=String(f.get('order_id')??'').trim(),status=String(f.get('status')??''),note=String(f.get('note')??'').trim().slice(0,500);if(!/^[0-9a-f-]{36}$/i.test(id)||!['preparing','out_for_delivery','delivered','cancelled'].includes(status))redirect('/orders?result=invalid');const db=await createClient();const cap=await db.rpc('has_capability',{p_capability:'order.manage'});if(cap.error||cap.data!==true)redirect('/orders?result=denied');const {error}=await db.rpc('order_advance',{p_order_id:id,p_status:status,p_note:note||null});if(error){console.error('order advance failed',{code:error.code});redirect('/orders?result=failed')}revalidatePath('/orders');redirect('/orders?result=saved')}
