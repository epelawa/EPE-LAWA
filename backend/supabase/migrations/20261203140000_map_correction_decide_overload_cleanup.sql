-- Remove the eight-argument stub overload provided by 20261203115000 only so the
-- historical grant in 20261203120000 could apply. The real decision function keeps
-- its nine-argument signature; any residual grant on the stub disappears with it.
drop function if exists public.map_correction_decide(uuid,text,text,text,numeric,numeric,text,text);
