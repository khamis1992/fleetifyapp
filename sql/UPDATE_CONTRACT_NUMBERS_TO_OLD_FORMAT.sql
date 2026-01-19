-- ================================================================
-- UPDATE CONTRACT NUMBERS: Match agreements_with_details.sql
-- ================================================================
-- Auto-generated from agreements_with_details.sql
-- Total records: 415
-- Strategy: Match by customer name + rental amount, then update contract number
-- ================================================================

-- ================================================================
-- STAGE 1: Create temp table with old contract numbers
-- ================================================================
DROP TABLE IF EXISTS temp_old_contract_numbers;

CREATE TEMP TABLE temp_old_contract_numbers (
  old_contract_number TEXT,
  customer_name TEXT,
  rent_amount NUMERIC,
  license_plate TEXT
);

-- Insert all old contract data
INSERT INTO temp_old_contract_numbers (old_contract_number, customer_name, rent_amount, license_plate) VALUES
  ('LTO2024139', 'issam abdallah', 2100, '7036'),
  ('LTO20249', 'MEHRAN TABIB TABIB HUSSAIN', 0, '749762'),
  ('Ret-2018184', 'snoonu snoonu', 0, '711464'),
  ('LTO202453', 'AHMED BEN DHAOU', 0, '7071'),
  ('MR2024182', 'haythem souissi', 0, '7078'),
  ('Ret-2018200', 'snoonu snoonu', 0, '2774'),
  ('LTO2024141', 'bannour rekaia', 1600, '7060'),
  ('LTO202422', 'AHMED ABBAS ELDAWO ELHASHMI', 2100, '2771'),
  ('MR202481', 'frank williams', 0, '10853'),
  ('LTO2024339', 'marwen safsafi', 1500, '706150'),
  ('276', 'hassan sharif', 0, '706150'),
  ('MR2024155', 'abdelghani abboud', 0, '749762'),
  ('AGR-202504-412264', 'احمد جمعة', 1600, '381247'),
  ('LTO2024322', 'said chenouf', 0, '7063'),
  ('LTO202429', 'Mohammed ali Fetoui', 0, '2767'),
  ('MR202473', 'faisal iqbal', 0, '754705'),
  ('Ret-2018189', 'snoonu snoonu', 0, '2772'),
  ('MR202464', 'shahid rehman', 0, '7078'),
  ('LTO2024108', 'sajjad gul', 0, '856589'),
  ('AGR-202504-408522', 'عبد الغفور درار', 1500, '2767'),
  ('MR2024181', 'MOHAMED AMINE SALEM', 0, '7057'),
  ('LTO202490', 'haytham zarrouk', 0, '563829'),
  ('Ret-2018185', 'snoonu snoonu', 0, '893408'),
  ('LTO2024310', 'kaies ayari', 1800, '8203'),
  ('Ret-2018220', 'snoonu snoonu', 0, '10174'),
  ('Ret-2018219', 'snoonu snoonu', 0, '9902'),
  ('AGR-202504-399591', 'شرفي عبد الله', 1500, '2782'),
  ('LTO202428', 'SOUFIANE BESSAOUDI', 0, '4017'),
  ('AGR-938047-996', 'محمد عبد الله سلمان', 1400, '862165'),
  ('LTO202427', 'AYMEN HAMADI', 2100, '5889'),
  ('Ret-2018223', 'snoonu snoonu', 0, '646507'),
  ('LTO2024100', 'tarak tunisia', 75600, '847601'),
  ('LTO202426', 'Nacer Lahcene', 0, '4016'),
  ('LTO2024252', 'mahdi yousif', 1700, '721440'),
  ('Ret-2018218', 'snoonu snoonu', 0, '10189'),
  ('LTO2024316', 'yahia sakhri', 0, '749762'),
  ('In201893', 'abdelazim pro', 0, '761292'),
  ('MR202485', 'raphael denu', 0, '10849'),
  ('LTO2024341', 'issam abdallah', 1500, '7036'),
  ('LTO2024130', 'EIHAB ABDALLA', 0, '7056'),
  ('LTO2024126', 'MAMOUN AHMED', 0, '8209'),
  ('AGR-202504-421999', 'عبد الحميد عترون', 1500, '10853'),
  ('LTO202411', 'MUHAMMAD ALI KHALID', 0, '4014'),
  ('Ret-2018210', 'snoonu snoonu', 0, '816508'),
  ('LTO2024288', 'ahmed fadil', 1800, '2634'),
  ('AGR-202504-414082', 'اسلام عثمان محمدين', 1500, '10851'),
  ('MR202487', 'eric naiko', 0, '741277'),
  ('Ret-2018199', 'snoonu snoonu', 0, '856878'),
  ('MR2024234', 'MOHAMED AMINE SALEM', 0, '9902'),
  ('AGR-202504-406129', 'حسان بو علاق', 1700, '856718'),
  ('MR202470', 'imran farhad', 0, '7062'),
  ('LTO20245', 'ZAINUDEEN MOHAMED IZADEEN', 0, '8210'),
  ('LTO2024299', 'marwen safsafi', 0, '563829'),
  ('AGR-202504-417240', 'ياسر الصادق القاسم', 1500, '10671'),
  ('AGR-202502-0418', 'كبيروم العرجاوي ولدكيدان', 1250, '10174'),
  ('MR2024146', 'saidi ababa', 0, '10064'),
  ('LTO202441', 'SAYED I.A ELSAYED', 0, '7054'),
  ('LTO2024321', 'mounir lechelache', 0, '10664'),
  ('AGR-202504-409871', 'محمد جاسم صالح', 1600, '7054'),
  ('LTO202495', 'OSAMA GRESS', 0, '862169'),
  ('LTO2024119', 'MOTAZ ABOSHABA', 0, '21860'),
  ('MR202475', 'tamer el sayed', 2100, '7038'),
  ('LTO20246', 'Elsadigh Salih Ibrahim Diab', 0, '185485'),
  ('LTO2024287', 'ahmed babiker ahmed', 1550, '2778'),
  ('AGR-202504-417839', 'إبراهيم يعقوب', 1500, '7042'),
  ('AGR-202504-420819', 'عصام احمداحمد', 1500, '8208'),
  ('LTO202438', 'ALI SALIM MZITA', 0, '9902'),
  ('LTO2024240', 'aliyu umar', 0, '7058'),
  ('LTO2024144', 'soufiane allaoua', 0, '7054'),
  ('LTO2024128', 'tarek rahali', 1700, '754705'),
  ('LTO2024314', 'mohamed amine chouchene', 1750, '5893'),
  ('Ret-2018187', 'snoonu snoonu', 0, '7063'),
  ('AGR-202504-398252', 'محمد العويني', 1600, '21860'),
  ('LTO2024276', 'saeed al-hebabi', 1600, '8209'),
  ('LTO2024279', 'AHMED BEN DHAOU', 0, '817009'),
  ('AGR-202504-407328', 'عمار الشيخ', 1500, '7034'),
  ('LTO202412', 'RECEP KART', 0, '8212'),
  ('LTO202435', 'HOUSSIN HENI', 0, '10854'),
  ('LTO202447', 'Mohamed Hathroubi', 1800, '752724'),
  ('MR202461', 'mohamed shikh', 0, '10667'),
  ('LTO202449', 'AHMED ABBAS ELDAWO ELHASHMI', 0, '862165'),
  ('LTO202439', 'HAMZA ZIDI', 0, '8207'),
  ('AGR-202504-412862', 'إيهاب عبد الله', 1500, '185573'),
  ('LT0RO14', 'KHAMfffffffIS AL-JABOR', 5000, 'TEST-123'),
  ('AGR-349301-729', 'abdelazim pro', 1200, 'TEST-123'),
  ('LTO2024291', 'abdulla al-shahri', 0, '381247'),
  ('AGR-202504-419022', 'يحيى عبد الرحمان', 1750, '856589'),
  ('LTO2024151', 'chrisus arinaitwe', 0, '2783'),
  ('AGR-202504-416046', 'هشام عبد العظيم', 1700, '8209'),
  ('LTO2024266', 'mohamed abdalla', 1750, '5900'),
  ('LTO2024148', 'hechem mejri', 0, '2773'),
  ('251', 'mohamed boumahni', 1750, '7054'),
  ('LTO2024300', 'mohamed amine chouchene', 0, '7058'),
  ('LTO202445', 'Badredine Khalfi', 2200, '847059'),
  ('MR202467', 'omer omer', 0, '10670'),
  ('LTO202457', 'Mukhtar Ali Anayat UR RAHMAN', 0, '5898'),
  ('LTO202410', 'ABDELAZIZ JERFEL', 1500, '17216'),
  ('LTO2024284', 'ISSAM MZOUGHI', 1800, '7069'),
  ('Ret-2018206', 'snoonu snoonu', 0, '856715'),
  ('LTO2024153', 'AHMED AKKAR', 2500, '335485'),
  ('LTO20244', 'HOSSEM DHAHRI', 2100, '5901'),
  ('LT0RO06', 'KHAfgfgfgfgMIS AL-JABOR', 2500, 'TEST-123'),
  ('LTO2024133', 'OLALEYE ALO', 0, '7040'),
  ('LTO2024125', 'ANWAR MOHAMED', 1300, '10172'),
  ('Ret-2018198', 'snoonu snoonu', 0, '521207'),
  ('LT0RO11', 'KHAfgfgfgfgMIS AL-JABOR', 3000, 'TEST-123'),
  ('LTO2024107', 'ravi ravi', 2500, '848014'),
  ('LTO2024319', 'ABUOBIDA BABIKER MOHAMED AHMED SIDDIG', 1800, '2784'),
  ('In2018175', 'faisal iqbal', 0, '856878'),
  ('LT0RO19', 'محمود مازن محمود عباس', 1500, '234'),
  ('LTO2024282', 'SIHEM BEN AHMED', 0, '754436'),
  ('LTO2024264', 'ATEF MANSOUR', 0, '7058'),
  ('LTO202497', 'MAHDI HOSNI', 2100, '846508'),
  ('LTO2024254', 'mahmoud hassanein', 0, '7062'),
  ('AGR-635810-055', 'زين العابدين ادريس', 1400, '9902'),
  ('LTO2024303', 'jabir desta', 1800, '7057'),
  ('In2018181', 'MUHAMMAD GUL', 0, '10853'),
  ('AGR-718465-283', 'abdelazim pro', 1200, 'TEST-123'),
  ('LTO2024143', 'ahmed MASGHOUNI', 0, '7043'),
  ('MR2024115', 'awuah baffour', 0, '521207'),
  ('LTO2024268', 'ATEF MANSOUR', 1850, '856925'),
  ('AGR-202504-424367', 'محمد إبراهيم', 1600, '7040'),
  ('Ret-2018222', 'snoonu snoonu', 0, '711464'),
  ('MR202460', 'mohamed nawaz', 0, '2768'),
  ('LTO2024103', 'ala eddine hsin', 1200, '9255'),
  ('LT0RO01', 'KHAMIS AL-JABORrttttrrrr', 1500, '234'),
  ('LTO2024296', 'HANENE JELASSI', 1300, '862165'),
  ('LT0RO21', 'عائشة سالم المري', 5000, '4015'),
  ('LTO2024330', 'AHMED BEN DHAOU', 0, '21849'),
  ('AGR-954526-295', 'سيف الدولة عيسى', 1500, '2776'),
  ('Ret-2018129', 'mohamed shikh', 0, '721440'),
  ('AGR-202502-0416', 'يوسف سقام', 1700, '2778'),
  ('LTO2024242', 'nabil fargalla', 1700, '5898'),
  ('LTO2024106', 'ravi ravi', 2268, '847987'),
  ('In2018176', 'emmanuel darko', 0, '10664'),
  ('Ret-2018209', 'snoonu snoonu', 0, '746956'),
  ('LTO202432', 'ZINELABIDINE BADRA', 0, '5891'),
  ('LTO2024145', 'ABDULRAHMAN ALGHAIATHI', 0, '5900'),
  ('In2018224', 'faisal iqbal', 0, '9905'),
  ('LTO202436', 'Mohammed Muslim', 2100, '7064'),
  ('Ret-2018215', 'snoonu snoonu', 0, '7053'),
  ('MR202474', 'zied fares', 1240, '10176'),
  ('LTO2024261', 'YOUSSEF KHALILI', 1750, '7072'),
  ('LT0RO04', 'تجربة ثانية', 1500, 'TEST-123'),
  ('MR202466', 'hosni maatallah', 0, '10174'),
  ('LTO202458', 'MONCEF SAIBI', 0, '7074'),
  ('Ret-2018202', 'snoonu snoonu', 0, '8207'),
  ('MR2024122', 'SOUFIANE BESSAOUDI', 0, '10851'),
  ('MR2024302', 'saeed al-hebabi', 0, '749762'),
  ('Ret-2018195', 'snoonu snoonu', 0, '2770'),
  ('LTO20247', 'Elsadigh Salih Ibrahim Diab', 1800, '185513'),
  ('LTO2024155', 'oussama` bouguerra', 0, '7054'),
  ('AGR-202504-414676', 'مؤمن علي سعيد', 1650, '856878'),
  ('LTO2024105', 'ravi ravi', 2268, '847941'),
  ('LTO2024156', 'ahmed babker', 2000, '5899'),
  ('LTO202421', 'Suman Kumar shah', 0, '2777'),
  ('LTO2024278', 'MOURAD BARHOUMI', 0, '751340'),
  ('LTO2024304', 'achraf saadaoui', 0, '646507'),
  ('LT0RO10', 'KHAfgfgfgfgMIS AL-JABOR', 7000, 'TEST-123'),
  ('LTO2024263', 'MAHDI HAMID', 1800, '7053'),
  ('LTO2024149', 'mokhtar alil', 0, '7037'),
  ('In2018159', 'awuah baffour', 1500, '10854'),
  ('LTO2024251', 'KIBROM AREGAWI WELDEKIDAN', 1250, '10174'),
  ('LTO202448', 'Abdemoniem ismail mahmoud Mohamed', 2100, '8206'),
  ('Ret-2018204', 'snoonu snoonu', 0, '7073'),
  ('LTO2024265', 'GIRISHKUMAR KARTHIKEYAN', 1900, '856878'),
  ('LTO2024248', 'ismail mohamed', 1750, '2772'),
  ('AGR-055405-212', 'مهند حمود الظاهر', 1600, '7063'),
  ('LTO2024270', 'ahmed elwasila', 1500, '10197'),
  ('MR202498', 'MOHAMED AMINE SALEM', 0, '10189'),
  ('Ret-2018205', 'snoonu snoonu', 0, '7039'),
  ('MR202483', 'prince nkansah', 0, '751340'),
  ('LT0RO12', 'KHAfgfgfgfgMIS AL-JABOR', 3000, 'TEST-123'),
  ('In2018160', 'shadrack saky', 0, '10668'),
  ('LTO202491', 'radhwan mdini', 0, '893411'),
  ('Ret-2018217', 'snoonu snoonu', 0, '381247'),
  ('LTO2024297', 'yosr chamkhi', 0, '556199'),
  ('MR2024232', 'ABDELJALIL HATTACH', 0, '10669'),
  ('MR2024102', 'OASIM HALDER', 0, '821873'),
  ('LTO2024140', 'amir ben fredj', 0, '5895'),
  ('LTO2024320', 'mohammed houssem dib', 0, '5894'),
  ('AGR-202504-403859', 'مختار عليل', 1600, '2779'),
  ('LTO2024247', 'QFORCE SECURITY SERVICE', 57600, '548682'),
  ('AGR-810033-532', 'dtrgfgdfg', 1300, '8205'),
  ('308', 'mustafa almustafa', 5400, '381247'),
  ('Ret-2018216', 'snoonu snoonu', 0, '648144'),
  ('LTO2024315', 'mohamed ncibi', 1800, '739649'),
  ('AGR-463481-549', 'محمد علي سليم', 1500, '4014'),
  ('LTO2024138', 'RAFIK BELKACEM', 1600, '7040'),
  ('LTO202455', 'AYMEN NASRA', 0, '10856'),
  ('AGR-202504-418432', 'موسى حيمر', 1600, '5891'),
  ('LTO2024243', 'mohamed elnakhli', 1250, '9999'),
  ('MR202468', 'abrar zaib', 0, '7039'),
  ('LTO202492', 'mouheb ouni', 0, '722134'),
  ('LTO2024285', 'CHIHEB HEDHLI', 64800, '857051'),
  ('LT0RO09', 'KHAfgfgfgfgMIS AL-JABOR', 1500, 'TEST-123'),
  ('LTO2024293', 'saber dhibi', 1750, '2774'),
  ('LTO2024338', 'ahmed abdalla mahmoud abdalla mahmoud abdalla', 0, '2779'),
  ('LTO2024118', 'DEO SSENYANJA', 1280, '9891'),
  ('LTO2024342', 'azhari hakim khalid hakim', 1500, '7065'),
  ('LTO2024147', 'salah masaad', 0, '548682'),
  ('Ret-2018225', 'snoonu snoonu', 0, '893409'),
  ('Ret-2018228', 'snoonu snoonu', 0, '725473'),
  ('MR2024236', 'syed jan', 0, '2770'),
  ('AGR-202504-411671', 'عبد اللله العلواني', 1600, '5894'),
  ('Ret-2018221', 'snoonu snoonu', 0, '822389'),
  ('LTO2024326', 'MOHAMMAD ADNAN SWAID', 0, '8208'),
  ('LT0RO17', 'احمد عبدالله طاهر ادريس', 1750, '10665'),
  ('In2018167', 'MOHAMMED ULLAH', 0, '10850'),
  ('AGR-202504-403263', 'فادي السعيدي', 1700, '21849'),
  ('LTO2024333', 'achraf saadaoui', 1500, '10664'),
  ('LTO20248', 'HOSSEM DHAHRI 2', 2200, '846485'),
  ('MR202463', 'abdelkader abdelkader', 0, '570468'),
  ('Ret-2018213', 'snoonu snoonu', 0, '646507'),
  ('LTO2024305', 'mohamed ahmed', 0, '7041'),
  ('Ret-201896', 'abduaziz almhauod', 0, '739649'),
  ('Ret-2018212', 'snoonu snoonu', 0, '11473'),
  ('test 3', 'abduaziz almhauod', 0, '856715'),
  ('Ret-2018196', 'snoonu snoonu', 0, '7072'),
  ('LTO2024273', 'AHMED EDRISS', 1750, '10665'),
  ('AGR-202504-410464', 'هاني براهمي', 1600, '2774'),
  ('LTO202418', 'Mohammad Haitham ettahar elhaddi mohamad', 1500, '7075'),
  ('LTO202446', 'Salih abdullah mohamed Ahmad', 2100, '2776'),
  ('MR2024274', 'walid hassan', 1750, '2766'),
  ('AGR-202502-0422', 'عبدالغفور درار', 1500, '2767'),
  ('Ret-2018193', 'snoonu snoonu', 0, '556199'),
  ('Ret-2018190', 'snoonu snoonu', 0, '7067'),
  ('LTO2024124', 'AMIR EL MAHDI', 2300, '847099'),
  ('LT0RO15', 'جاسم محمد الصالح', 1500, '10666'),
  ('LTO2024257', 'ahmed elwasila', 0, '9905'),
  ('LT0RO18', 'عدنان محمد شودر', 1500, 'TEST-123'),
  ('LTO2024136', 'alaeddine dabech', 0, '7041'),
  ('LTO2024331', 'mohamed ncibi', 0, '751340'),
  ('In2018180', 'SAIF ramzan', 0, '749403'),
  ('In2018161', 'emmanuel darko', 0, '10666'),
  ('LTO2024295', 'sabri mbarki', 1800, '856589'),
  ('AGR-202504-397268', 'يوسف سقام', 1700, '2778'),
  ('AGR-202504-400949', 'عبد المنعم', 1500, '10668'),
  ('LTO2024135', 'ABDALLA ABDALLA', 1600, '5897'),
  ('LTO2024334', 'hakim kouas', 1750, '7063'),
  ('MR2024123', 'DEO SSENYANJA', 0, '10858'),
  ('LTO2024327', 'tarek boutemedjet', 1750, '2770'),
  ('LTO2024258', 'ABDELLATIF ELHADAD', 0, '2783'),
  ('319', 'MOHAMED CHOUCHENE', 1600, '7058'),
  ('LTO2024269', 'muhammad mahmood', 0, '648144'),
  ('Ret-2018203', 'snoonu snoonu', 0, '2777'),
  ('LTO2024340', 'ABDELAZIZ JERFEL', 1500, '5890'),
  ('LTO202459', 'Yassine Serhani', 2100, '2780'),
  ('AGR-202504-405141', 'حسن محمد الفكي', 1600, '8212'),
  ('LTO2024301', 'ahmed ali mohamed bakhit', 0, '821873'),
  ('LTO202430', 'Hamza Serunga', 0, '8205'),
  ('LTO2024272', 'tarek rahali', 0, '7074'),
  ('Ret-2018214', 'snoonu snoonu', 0, '335750'),
  ('LTO2024267', 'hamze hussein', 2000, '8208'),
  ('AGR-202504-413489', 'علم الدين جمعة', 1500, '7056'),
  ('LTO2024323', 'hakim kouas', 0, '754436'),
  ('LTO2024309', 'ahmed MASGHOUNI', 1800, '821873'),
  ('LTO2024313', 'marwen safsafi', 1250, '9905'),
  ('247', 'MOHAMMED ABDALLAH', 1700, '8207'),
  ('LTO2024232', 'ABDUL AZIZ WAIGA', 2100, '8212'),
  ('LTO202417', 'Abdelrahim Mohamed', 2100, '8213'),
  ('Ret-2018192', 'snoonu snoonu', 0, '2769'),
  ('LTO2024115', 'YASSER SOLIMAN', 2100, '7068'),
  ('AGR-202504-415263', 'عبد الصمد بن عزوز', 1650, '893409'),
  ('LTO2024292', 'mahamoud maan dabboussi', 1450, '721894'),
  ('LTO202413', 'HAMIDA BOUZIANE', 0, '721894'),
  ('AGR-202504-419607', 'سفيان صالح', 1650, '556199'),
  ('MR202462', 'osmane mohamed', 2100, '7042'),
  ('LTO2024178', 'KAMIL ALTAHIR', 0, '817009'),
  ('AGR-202504-409278', 'عمر مراىحي', 1650, '7059'),
  ('LTO202424', 'mokhtar alil', 0, '2774'),
  ('LTO2024280', 'HAMZA YANES', 1750, '7043'),
  ('LTO202451', 'ABDELJALIL HATTACH', 0, '5896'),
  ('Ret-2018226', 'snoonu snoonu', 0, '185573'),
  ('AGR-202504-416649', 'مصطفى  ساتي', 1700, '8213'),
  ('LTO2024132', 'AYMEN NASRA', 0, '2779'),
  ('LTO2024253', 'mohammed awad', 1700, '725473'),
  ('LTO2024337', 'waddah elobaid', 1500, '2769'),
  ('LTO2024233', 'radhwan mdini', 0, '893411'),
  ('In2018182', 'sead logomo', 0, '754436'),
  ('MR202486', 'richard asiedu', 0, '335485'),
  ('LTO2024112', 'ahmad salah', 0, '5894'),
  ('LT0RO08', 'KHAfgfgfgfgMIS AL-JABOR', 3000, 'TEST-123'),
  ('LTO2024120', 'baligh ben amor', 0, '2769'),
  ('LTO202450', 'ADAM SALIH G. MOHAMED', 2100, '7077'),
  ('AGR-283909-351', 'يحيى احمد عبدالرحمن', 1700, '756104'),
  ('LTO202423', 'Sofiene Ben salah', 0, '7058'),
  ('Ret-2018194', 'snoonu snoonu', 0, '5894'),
  ('LTO202433', 'Mouheb Gandouzi', 0, '8203'),
  ('LTO2024246', 'QFORCE SECURITY SERVICE', 57600, '335750'),
  ('In2018168', 'aurangzeb din', 0, '10849'),
  ('LTO2024109', 'Abdelrahim Mohamed', 1253, '9890'),
  ('LTO2024111', 'mohammad ismail', 0, '5899'),
  ('MR202469', 'ameer zaib', 0, '5893'),
  ('AGR-202502-0430', 'حسان بو علاق', 1700, '856718'),
  ('LT0RO13', 'KHAfgfgfgfgMIS AL-JABOR', 5000, 'TEST-123'),
  ('LTO202440', 'MUHAMMAD S.M.M KHALIFA', 0, '7070'),
  ('338', 'mohanad aldaher', 1600, '2777'),
  ('In2018158', 'lukman dramani', 0, '10855'),
  ('LTO202419', 'Mazyad Saab', 0, '7069'),
  ('AGR-202504-411066', 'عبد العزيز علي', 1500, '2768'),
  ('LTO2024332', 'ABDELAZIZ JERFEL', 0, '2778'),
  ('LT0RO20', 'محمود مازن محمود عباس', 1500, '7055'),
  ('139', 'omar hmem', 0, '5893'),
  ('AGR-202504-407921', 'يوسف قابل', 1500, '2773'),
  ('AGR-202502-0420', 'ثامر محمد', 2000, '7038'),
  ('Ret-2018197', 'snoonu snoonu', 0, '7071'),
  ('Ret-2018201', 'snoonu snoonu', 0, '2768'),
  ('LTO2024117', 'mohamed noomani', 0, '5890'),
  ('LTO2024277', 'emad bhagil', 1700, '185573'),
  ('AGR-202504-406726', 'مختارالامين', 1500, '5896'),
  ('LTO202416', 'Abdelrahim Mohamed', 2100, '4018'),
  ('MR202488', 'lukman dramani', 0, '7065'),
  ('LTO2024245', 'MOHAMED AHMED', 1800, '7056'),
  ('MR202465', 'amjid wadan', 0, '7043'),
  ('LTO2024152', 'HANY HUSHAM', 0, '857051'),
  ('AGR-047661-681', 'مجدي بخيت', 1500, '2773'),
  ('AGR-202504-420218', 'سامي عبد الله', 1700, '4016'),
  ('In2018227', 'tarak tunisia', 0, '7078'),
  ('LTO2024114', 'tarak hamlet', 350, '9894'),
  ('LTO2024317', 'imed ayari', 1250, '11473'),
  ('288', 'AMMAR GHOZY', 1750, '893410'),
  ('LTO2024262', 'ADIL ABDELKARIM', 1750, '7067'),
  ('In2018171', 'zafar ullah badshah', 0, '741277'),
  ('LTO202414', 'Ghazi Emmad ben meddeb', 0, '7034'),
  ('AGR-222397-636', 'محمد عبد الله سلمان', 1400, '862165'),
  ('In2018169', 'RIZWAN BAHADAR', 0, '749762'),
  ('In2018170', 'MUHAMMAD GUL', 0, '746956'),
  ('LTO2024271', 'ahmed elwasila', 1250, '10189'),
  ('LTO2024312', 'ahmed ali mawlod abdalla', 1800, '4016'),
  ('AGR-592533-558', 'احمد عبدالله محمد', 1550, '7041'),
  ('LTO202415', 'Zyed Yahmadi', 1800, '8214'),
  ('LT0RO03', 'KHAMIS AL-JABOReeee', 2500, '234'),
  ('MR202477', 'shadrack saky', 0, '749403'),
  ('AGR-202504-402280', 'فادي السعيدي', 1700, '856715'),
  ('LTO202494', 'KOSAY HAMMAMI', 0, '10197'),
  ('AGR-202504-424958', 'محمد محمد احمد', 1650, '2766'),
  ('LTO2024113', 'mokhtar alil', 0, '893410'),
  ('LTO2024235', 'amir ben fredj', 0, '2773'),
  ('In2018166', 'awol ibrahim', 0, '10669'),
  ('AGR-202502-0426', 'محمد العويني', 1600, '21860'),
  ('In2018115', 'prince boateng', 0, '746956'),
  ('MR202489', 'samuel yeboah', 0, '754436'),
  ('MR202482', 'josef ado', 0, '10855'),
  ('LTO202443', 'Mohammad ibrar Abdul hanan', 0, '8208'),
  ('LT0RO02', 'KHAMIS AL-JABOReeee', 1500, 'TEST-123'),
  ('MR202479', 'emmanuel darko', 0, '10064'),
  ('LTO2024289', 'mahmoud jassem alsaleh', 0, '2769'),
  ('LTO2024237', 'hany mohamed', 0, '8208'),
  ('LTO202437', 'Hamza BADOU', 1060, '676281'),
  ('LTO2024244', 'EIHAB ABDALLA', 1786, '856715'),
  ('In2018172', 'sead logomo', 0, '749403'),
  ('LTO2024239', 'mohamed yousif', 1650, '10669'),
  ('Ret-2018208', 'snoonu snoonu', 0, '706150'),
  ('LTO2024294', 'ahmed arsheen', 1800, '756104'),
  ('LTO202454', 'VARUN KUMAR C CHAUHAN', 0, '856925'),
  ('Ret-2018229', 'snoonu snoonu', 0, '751340'),
  ('AGR-202504-423180', 'عبد الله برهام', 1600, '7039'),
  ('AGR-202504-422586', 'قسورة عبد الرحيم', 1500, '10858'),
  ('LTO2024104', 'ravi ravi', 2268, '847932'),
  ('330', 'yahia sakhri', 0, '7062'),
  ('LT0RO16', 'علاء الدين بوزيان', 1500, '10856'),
  ('LTO202434', 'Haq Nawaz Rahim Bakhsh', 0, '8204'),
  ('LTO2024335', 'mahmoud jassem alsaleh', 1500, '7074'),
  ('MR202476', 'clement gyamerah', 0, '819027'),
  ('AGR-730480-043', 'abdelazim pro', 1200, 'TEST-123'),
  ('LTO2024230', 'hamdi thabet', 1260, '722134'),
  ('LTO2024134', 'olusegun onadairo', 0, '7062'),
  ('LTO20242', 'AMARA KHARROUBI', 2100, '857045'),
  ('AGR-202502-0424', 'مؤسى حيمر', 1600, '5891'),
  ('LTO2024256', 'mohamed abdalla', 0, '648144'),
  ('LTO202442', 'WALID CHOURABI', 2100, '846560'),
  ('LTO202431', 'Abdulhanna abulhashem', 2100, '7061'),
  ('LTO2024116', 'ALI ABBAS', 0, '5898'),
  ('LTO2024290', 'saddam el falah', 0, '906077'),
  ('Ret-2018207', 'snoonu snoonu', 0, '893410'),
  ('LTO2024150', 'HABIB KHELIFI', 2000, '8204'),
  ('LTO2024306', 'tarek boutemedjet', 0, '862169'),
  ('In2018173', 'mubarek golcha', 0, '570468'),
  ('LT0RO07', 'KHAfgfgfgfgMIS AL-JABOR', 5000, 'TEST-123'),
  ('LTO2024298', 'kaies ayari', 0, '754436'),
  ('AGR-202504-421408', 'ماهر مهيري', 1600, '2771'),
  ('Ret-2018191', 'snoonu snoonu', 0, '2781'),
  ('MR202484', 'foster ngo', 0, '816508'),
  ('LTO2024238', 'hamze hussein', 0, '817009'),
  ('AGR-950558-871', 'زين العابدين ادريس', 1400, '9902'),
  ('LTO2024308', 'wassim chatmen', 1050, '10064'),
  ('LTO2024325', 'mohamed ahmed', 0, '711289'),
  ('LTO20243', 'MEDHAT BAKRY', 0, '21849'),
  ('LTO202452', 'KHALIL CHMENGUI', 0, '9999'),
  ('MR202472', 'almunzer ali', 0, '7056'),
  ('In2018157', 'prince boateng', 0, '10858'),
  ('LTO2024250', 'ABUELMAALI ISMAIL', 1700, '7078'),
  ('LTO202420', 'Awad el karim Abdelmonim', 2525, '7066'),
  ('Ret-2018211', 'snoonu snoonu', 0, '721440'),
  ('MR2024121', 'Sofiene Ben salah', 0, '10854'),
  ('LTO2024283', 'fatima akka', 0, '862165'),
  ('MR2024110', 'riaz khan', 0, '7057'),
  ('LTO202444', 'Saif ur rehman mohammad Ramzan', 0, '7072'),
  ('LTO2024311', 'mohamed hassen omer mohamed', 0, '4016'),
  ('Ret-2018183', 'snoonu snoonu', 0, '2782'),
  ('LTO202499', 'HICHEM ABDERAHIM', 0, '7035'),
  ('LTO2024101', 'issam hamdani', 75600, '7076'),
  ('LTO2024142', 'MOJEEB AMIN', 1750, '7035'),
  ('LTO202425', 'ANOUER MATHLOUTHI', 0, '557098'),
  ('Ret-2018188', 'snoonu snoonu', 1600, '10666'),
  ('AGR-302522-016', 'بسام فتحي اللوز', 1700, '7057'),
  ('LTO2024177', 'atef sghairi', 2000, '5888'),
  ('LT0RO05', 'تجربة ثانية', 2500, '234'),
  ('AGR-202504-404457', 'أنور جنبيني', 1600, '2775'),
  ('MR202471', 'abdul basit khan', 0, '7041'),
  ('LTO2024281', 'saeed al-hebabi', 1800, '21860'),
  ('LTO2024255', 'ganga chaudhary', 1300, '10672'),
  ('LTO202456', 'SAID HILALI', 345, '21875'),
  ('Ret-2018186', 'snoonu snoonu', 0, '10171');

-- ================================================================
-- STAGE 2: Backup current contract numbers
-- ================================================================
CREATE TABLE IF NOT EXISTS contract_number_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id UUID,
  old_contract_number TEXT,
  new_contract_number TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ================================================================
-- STAGE 3: Smart matching and update contract numbers
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_matched INTEGER := 0;
  v_updated INTEGER := 0;
  v_rec RECORD;
  v_progress INTEGER := 0;
  v_current_number TEXT;
  v_contract_id UUID;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🔄 UPDATING CONTRACT NUMBERS TO MATCH AGREEMENTS FILE';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Processing 415 contracts...';
  RAISE NOTICE '';
  
  FOR v_rec IN SELECT * FROM temp_old_contract_numbers
  LOOP
    v_progress := v_progress + 1;
    
    -- Find matching contract by customer name + rental amount
    SELECT c.id, c.contract_number INTO v_contract_id, v_current_number
    FROM contracts c
    INNER JOIN customers cust ON cust.id = c.customer_id
    WHERE c.company_id = v_company_id
      AND (
        -- Customer name matching (fuzzy)
        LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, ''))) 
          LIKE '%' || LOWER(TRIM(v_rec.customer_name)) || '%'
        OR LOWER(TRIM(v_rec.customer_name)) 
          LIKE '%' || LOWER(TRIM(COALESCE(cust.first_name_ar, cust.company_name_ar, ''))) || '%'
      )
      AND (
        -- Rental amount verification
        v_rec.rent_amount = 0
        OR c.monthly_amount = v_rec.rent_amount
        OR c.contract_amount = v_rec.rent_amount
        OR ABS(COALESCE(c.monthly_amount, 0) - v_rec.rent_amount) <= (v_rec.rent_amount * 0.1)
        OR ABS(COALESCE(c.contract_amount, 0) - v_rec.rent_amount) <= (v_rec.rent_amount * 0.1)
      )
      AND (
        -- License plate matching (if available)
        v_rec.license_plate IS NULL
        OR c.license_plate IS NULL
        OR c.license_plate = v_rec.license_plate
      )
    LIMIT 1;
    
    -- If contract found, update the number
    IF v_contract_id IS NOT NULL THEN
      -- Backup old number
      INSERT INTO contract_number_history (contract_id, old_contract_number, new_contract_number)
      VALUES (v_contract_id, v_current_number, v_rec.old_contract_number)
      ON CONFLICT DO NOTHING;
      
      -- Update contract number
      UPDATE contracts
      SET 
        contract_number = v_rec.old_contract_number,
        updated_at = NOW()
      WHERE id = v_contract_id
        AND company_id = v_company_id;
      
      GET DIAGNOSTICS v_updated = ROW_COUNT;
      
      IF v_updated > 0 THEN
        v_matched := v_matched + 1;
      END IF;
    END IF;
    
    -- Progress every 50 records
    IF v_progress % 50 = 0 THEN
      RAISE NOTICE '   Progress: % / 415 processed...', v_progress;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total contracts updated: %', v_matched;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Check if CNT-25-0479 was updated to old number
SELECT 
  '🔍 Checking contract numbers' as check_type,
  c.contract_number,
  cust.first_name_ar as customer,
  c.license_plate,
  c.monthly_amount,
  h.old_contract_number as previous_number
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
LEFT JOIN contract_number_history h ON h.contract_id = c.id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number IN ('LTO2024139', 'LTO2024341', 'LTO20249', 'CNT-25-0479')
ORDER BY c.contract_number
LIMIT 10;

-- Show sample of updated contracts
SELECT 
  '✅ Sample Updated Contract Numbers' as section,
  c.contract_number as new_number,
  h.old_contract_number as was_before,
  cust.first_name_ar as customer,
  c.license_plate,
  c.updated_at
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
LEFT JOIN contract_number_history h ON h.contract_id = c.id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND h.old_contract_number IS NOT NULL
ORDER BY c.updated_at DESC
LIMIT 20;

-- Statistics
SELECT 
  '📊 Update Statistics' as report,
  COUNT(DISTINCT contract_id) as total_contracts_updated,
  COUNT(*) as total_history_records
FROM contract_number_history;

-- Sample old vs new numbers
SELECT 
  '📋 Old vs New Contract Numbers' as section,
  old_contract_number as from_CNT_format,
  new_contract_number as to_old_format,
  updated_at
FROM contract_number_history
ORDER BY updated_at DESC
LIMIT 10;

-- Clean up
DROP TABLE IF EXISTS temp_old_contract_numbers;

-- ================================================================
-- SUMMARY
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ CONTRACT NUMBERS UPDATE COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 What was done:';
  RAISE NOTICE '1. ✅ Matched contracts by customer name + rental amount';
  RAISE NOTICE '2. ✅ Backed up current numbers to contract_number_history';
  RAISE NOTICE '3. ✅ Updated contract_number to match agreements file';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Check the results above!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Example:';
  RAISE NOTICE '   CNT-25-0479 → LTO2024341 (issam abdallah)';
  RAISE NOTICE '';
  RAISE NOTICE '⚠️ You can rollback if needed using contract_number_history table';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;
