-- Inventory Demand Forecasts
CREATE POLICY "Users can view inventory demand forecasts" ON public.inventory_demand_forecasts FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage inventory demand forecasts" ON public.inventory_demand_forecasts FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Optimization Metrics
CREATE POLICY "Users can view inventory optimization metrics" ON public.inventory_optimization_metrics FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "System can manage inventory optimization metrics" ON public.inventory_optimization_metrics FOR ALL USING (company_id = (SELECT get_user_company_id()));

-- Inventory Purchase Order Items
CREATE POLICY "Users can view inventory purchase order items" ON public.inventory_purchase_order_items FOR SELECT USING (order_id IN (SELECT id FROM public.inventory_purchase_orders WHERE company_id = (SELECT get_user_company_id())));
CREATE POLICY "Admins can manage inventory purchase order items" ON public.inventory_purchase_order_items FOR ALL USING (order_id IN (SELECT id FROM public.inventory_purchase_orders WHERE company_id = (SELECT get_user_company_id())) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Purchasing Rules
CREATE POLICY "Users can view inventory purchasing rules" ON public.inventory_purchasing_rules FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage inventory purchasing rules" ON public.inventory_purchasing_rules FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Replenishment Requests
CREATE POLICY "Users can view inventory replenishment requests" ON public.inventory_replenishment_requests FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage inventory replenishment requests" ON public.inventory_replenishment_requests FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Supplier Categories
CREATE POLICY "Users can view inventory supplier categories" ON public.inventory_supplier_categories FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "Admins can manage inventory supplier categories" ON public.inventory_supplier_categories FOR ALL USING (company_id = (SELECT get_user_company_id()) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Supplier Category Mapping
CREATE POLICY "Users can view inventory supplier category mapping" ON public.inventory_supplier_category_mapping FOR SELECT USING (supplier_id IN (SELECT id FROM public.inventory_suppliers WHERE company_id = (SELECT get_user_company_id())));
CREATE POLICY "Admins can manage inventory supplier category mapping" ON public.inventory_supplier_category_mapping FOR ALL USING (supplier_id IN (SELECT id FROM public.inventory_suppliers WHERE company_id = (SELECT get_user_company_id())) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Inventory Supplier Performance  
CREATE POLICY "Users can view inventory supplier performance" ON public.inventory_supplier_performance FOR SELECT USING (company_id = (SELECT get_user_company_id()));
CREATE POLICY "System can manage inventory supplier performance" ON public.inventory_supplier_performance FOR ALL USING (company_id = (SELECT get_user_company_id()));

-- Inventory Supplier Products
CREATE POLICY "Users can view inventory supplier products" ON public.inventory_supplier_products FOR SELECT USING (supplier_id IN (SELECT id FROM public.inventory_suppliers WHERE company_id = (SELECT get_user_company_id())));
CREATE POLICY "Admins can manage inventory supplier products" ON public.inventory_supplier_products FOR ALL USING (supplier_id IN (SELECT id FROM public.inventory_suppliers WHERE company_id = (SELECT get_user_company_id())) AND (SELECT is_company_admin((SELECT get_user_company_id()))));

-- Reminder History
CREATE POLICY "Users can view reminder history" ON public.reminder_history FOR SELECT USING (contract_id IN (SELECT id FROM public.contracts WHERE company_id = (SELECT get_user_company_id())));
CREATE POLICY "System can create reminder history" ON public.reminder_history FOR INSERT WITH CHECK (contract_id IN (SELECT id FROM public.contracts WHERE company_id = (SELECT get_user_company_id())));;
