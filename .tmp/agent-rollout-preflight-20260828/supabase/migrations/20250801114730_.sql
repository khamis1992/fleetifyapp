-- Add foreign key relationship between contracts and customers
ALTER TABLE public.contracts 
ADD CONSTRAINT fk_contracts_customer_id 
FOREIGN KEY (customer_id) 
REFERENCES public.customers(id) 
ON DELETE CASCADE;;
