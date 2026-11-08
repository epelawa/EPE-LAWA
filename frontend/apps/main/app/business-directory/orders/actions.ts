"use server";
import {revalidatePath} from "next/cache";
import {redirect} from "next/navigation";
import {createClient} from "../../../lib/supabase";
export async function advanceBusinessOrder(f:FormData):Promise<void>{const id=String(f.get('order_id')??'').trim(),status=String(f.get('status')??''),note=String(f.get('note')??'').trim().slice(0,500);if(!/^[0-9a-f-]{36}$/i.test(id)||!['preparing','out_for_delivery','delivered','cancelled'].includes(status))redirect('/business-directory/orders?result=invalid');const db=await createClient();const {data:{user}}=await db.auth.getUser();if(!user)redirect('/login?next=%2Fbusiness-directory%2Forders');const {error}=await db.rpc('order_advance',{p_order_id:id,p_status:status,p_note:note||null});if(error){console.error('business order advance failed',{code:error.code});redirect('/business-directory/orders?result=failed')}revalidatePath('/business-directory/orders');redirect('/business-directory/orders?result=saved')}
