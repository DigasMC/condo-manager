-- Seed from Excel
delete from public.condominiums where name = 'Condomínio Principal';
insert into public.condominiums (id, name, address, city, currency) values ('a0000000-0000-4000-8000-000000000001', 'Condomínio Principal', 'Portugal', 'Portugal', 'EUR');
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'A', 'C/V Esq', 70.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'B', 'C/V Dto', 100.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'C', 'R/C Esq', 100.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'D', 'R/C Dto', 100.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000001', 'E', '1º Esq', 100.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000006', 'a0000000-0000-4000-8000-000000000001', 'F', '1º Dto', 110.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000007', 'a0000000-0000-4000-8000-000000000001', 'G', '2º Esq', 100.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000008', 'a0000000-0000-4000-8000-000000000001', 'H', '2º Dto', 110.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000009', 'a0000000-0000-4000-8000-000000000001', 'I', '3º Esq', 100.0);
insert into public.units (id, condominium_id, code, floor_label, permilage) values ('a0000000-0000-4000-8000-000000000010', 'a0000000-0000-4000-8000-000000000001', 'J', '3º Dto', 110.0);
insert into public.people (id, condominium_id, full_name, nif, phone) values ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'Carlos Pires', NULL, NULL);
insert into public.people (id, condominium_id, full_name, nif, phone) values ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'Ana Sanches', NULL, NULL);
insert into public.people (id, condominium_id, full_name, nif, phone) values ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000001', 'Maria Castro', NULL, NULL);
insert into public.people (id, condominium_id, full_name, nif, phone) values ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000001', 'Marcelino Pimenta', NULL, NULL);
insert into public.people (id, condominium_id, full_name, nif, phone) values ('b0000000-0000-4000-8000-000000000005