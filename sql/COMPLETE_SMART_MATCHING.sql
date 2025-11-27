-- ================================================================
-- COMPLETE SMART MATCHING: All Al-Arraf Contracts
-- ================================================================
-- Auto-generated from agreements_with_details.sql
-- Total records: 415
-- Matching strategy: Customer Name + Rental Amount
-- ================================================================

-- ================================================================
-- STAGE 1: Add columns
-- ================================================================
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS license_plate TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS make TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS model TEXT;
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS year INTEGER;

-- ================================================================
-- STAGE 2: Create temp table with all agreement data
-- ================================================================
DROP TABLE IF EXISTS temp_agreements_full;

CREATE TEMP TABLE temp_agreements_full (
  customer_name TEXT,
  rent_amount NUMERIC,
  license_plate TEXT,
  make TEXT,
  model TEXT,
  year INTEGER
);

-- Insert all data
INSERT INTO temp_agreements_full (customer_name, rent_amount, license_plate, make, model, year) VALUES
  ('issam abdallah', 2100, '7036', 'Bestune', 'T77 pro', 2023),
  ('MEHRAN TABIB TABIB HUSSAIN', 0, '749762', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 0, '711464', 'Bestune', 'B70', 2023),
  ('AHMED BEN DHAOU', 0, '7071', 'Bestune', 'T77 pro', 2023),
  ('haythem souissi', 0, '7078', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '2774', 'Bestune', 'T77', 2023),
  ('bannour rekaia', 1600, '7060', 'Bestune', 'T77 pro', 2023),
  ('AHMED ABBAS ELDAWO ELHASHMI', 2100, '2771', 'Bestune', 'T77', 2023),
  ('frank williams', 0, '10853', 'changan', 'Alsvin', 2024),
  ('marwen safsafi', 1500, '706150', 'Bestune', 'B70', 2023),
  ('hassan sharif', 0, '706150', 'Bestune', 'B70', 2023),
  ('abdelghani abboud', 0, '749762', 'MG5', 'MG5', 2024),
  ('احمد جمعة', 1600, '381247', 'Bestune', 'B70', 2023),
  ('said chenouf', 0, '7063', 'Bestune', 'T77 pro', 2023),
  ('Mohammed ali Fetoui', 0, '2767', 'Bestune', 'T77', 2023),
  ('faisal iqbal', 0, '754705', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 0, '2772', 'Bestune', 'T77', 2023),
  ('shahid rehman', 0, '7078', 'Bestune', 'T77 pro', 2023),
  ('sajjad gul', 0, '856589', 'Bestune', 'B70s', 2023),
  ('عبد الغفور درار', 1500, '2767', 'Bestune', 'T77', 2023),
  ('MOHAMED AMINE SALEM', 0, '7057', 'Bestune', 'T77 pro', 2023),
  ('haytham zarrouk', 0, '563829', 'Bestune', 'T33', 2022),
  ('snoonu snoonu', 0, '893408', 'Bestune', 'B70', 2023),
  ('kaies ayari', 1800, '8203', 'GAC', 'GS3', 2024),
  ('snoonu snoonu', 0, '10174', 'Bestune', 'T33', 2022),
  ('snoonu snoonu', 0, '9902', 'Bestune', 'T33', 2022),
  ('شرفي عبد الله', 1500, '2782', 'Bestune', 'T77', 2023),
  ('SOUFIANE BESSAOUDI', 0, '4017', 'GAC', 'GS3', 2024),
  ('محمد عبد الله سلمان', 1400, '862165', 'Bestune', 'T33', 2022),
  ('AYMEN HAMADI', 2100, '5889', 'Bestune', 'T77', 2023),
  ('snoonu snoonu', 0, '646507', 'Bestune', 'B70', 2023),
  ('tarak tunisia', 75600, '847601', 'Ford', 'TERRITORY', 2023),
  ('Nacer Lahcene', 0, '4016', 'GAC', 'GS3', 2024),
  ('mahdi yousif', 1700, '721440', 'Bestune', 'B70', 2023),
  ('snoonu snoonu', 0, '10189', 'Bestune', 'T33', 2022),
  ('yahia sakhri', 0, '749762', 'MG5', 'MG5', 2024),
  ('abdelazim pro', 0, '761292', 'MG5', 'MG5', 2024),
  ('raphael denu', 0, '10849', 'changan', 'Alsvin', 2024),
  ('issam abdallah', 1500, '7036', 'Bestune', 'T77 pro', 2023),
  ('EIHAB ABDALLA', 0, '7056', 'Bestune', 'T77 pro', 2023),
  ('MAMOUN AHMED', 0, '8209', 'GAC', 'GS3', 2024),
  ('عبد الحميد عترون', 1500, '10853', 'changan', 'Alsvin', 2024),
  ('MUHAMMAD ALI KHALID', 0, '4014', 'GAC', 'GS3', 2024),
  ('snoonu snoonu', 0, '816508', 'MG5', 'MG5', 2024),
  ('ahmed fadil', 1800, '2634', 'dongfeng', 'A30', 2023),
  ('اسلام عثمان محمدين', 1500, '10851', 'changan', 'Alsvin', 2024),
  ('eric naiko', 0, '741277', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 0, '856878', 'Bestune', 'B70s', 2023),
  ('MOHAMED AMINE SALEM', 0, '9902', 'Bestune', 'T33', 2022),
  ('حسان بو علاق', 1700, '856718', 'Bestune', 'B70s', 2023),
  ('imran farhad', 0, '7062', 'Bestune', 'T77 pro', 2023),
  ('ZAINUDEEN MOHAMED IZADEEN', 0, '8210', 'GAC', 'GS3', 2024),
  ('marwen safsafi', 0, '563829', 'Bestune', 'T33', 2022),
  ('ياسر الصادق القاسم', 1500, '10671', 'changan', 'Alsvin', 2024),
  ('كبيروم العرجاوي ولدكيدان', 1250, '10174', 'Bestune', 'T33', 2022),
  ('saidi ababa', 0, '10064', 'Bestune', 'T33', 2022),
  ('SAYED I.A ELSAYED', 0, '7054', 'Bestune', 'T77 pro', 2023),
  ('mounir lechelache', 0, '10664', 'changan', 'Alsvin', 2024),
  ('محمد جاسم صالح', 1600, '7054', 'Bestune', 'T77 pro', 2023),
  ('OSAMA GRESS', 0, '862169', 'Bestune', 'T33', 2022),
  ('MOTAZ ABOSHABA', 0, '21860', 'Bestune', 'B70s', 2023),
  ('tamer el sayed', 2100, '7038', 'Bestune', 'T77 pro', 2023),
  ('Elsadigh Salih Ibrahim Diab', 0, '185485', 'Bestune', 'T77', 2023),
  ('ahmed babiker ahmed', 1550, '2778', 'Bestune', 'T77', 2023),
  ('إبراهيم يعقوب', 1500, '7042', 'Bestune', 'T77 pro', 2023),
  ('عصام احمداحمد', 1500, '8208', 'GAC', 'GS3', 2024),
  ('ALI SALIM MZITA', 0, '9902', 'Bestune', 'T33', 2022),
  ('aliyu umar', 0, '7058', 'Bestune', 'T77 pro', 2023),
  ('soufiane allaoua', 0, '7054', 'Bestune', 'T77 pro', 2023),
  ('tarek rahali', 1700, '754705', 'MG5', 'MG5', 2024),
  ('mohamed amine chouchene', 1750, '5893', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '7063', 'Bestune', 'T77 pro', 2023),
  ('محمد العويني', 1600, '21860', 'Bestune', 'B70s', 2023),
  ('saeed al-hebabi', 1600, '8209', 'GAC', 'GS3', 2024),
  ('AHMED BEN DHAOU', 0, '817009', 'MG5', 'MG5', 2024),
  ('عمار الشيخ', 1500, '7034', 'Bestune', 'T77 pro', 2023),
  ('RECEP KART', 0, '8212', 'GAC', 'GS3', 2024),
  ('HOUSSIN HENI', 0, '10854', 'changan', 'Alsvin', 2024),
  ('Mohamed Hathroubi', 1800, '752724', 'MG5', 'MG5', 2024),
  ('mohamed shikh', 0, '10667', 'changan', 'Alsvin', 2024),
  ('AHMED ABBAS ELDAWO ELHASHMI', 0, '862165', 'Bestune', 'T33', 2022),
  ('HAMZA ZIDI', 0, '8207', 'GAC', 'GS3', 2024),
  ('إيهاب عبد الله', 1500, '185573', 'Bestune', 'T77', 2023),
  ('KHAMfffffffIS AL-JABOR', 5000, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('abdelazim pro', 1200, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('abdulla al-shahri', 0, '381247', 'Bestune', 'B70', 2023),
  ('يحيى عبد الرحمان', 1750, '856589', 'Bestune', 'B70s', 2023),
  ('chrisus arinaitwe', 0, '2783', 'Bestune', 'T77', 2023),
  ('هشام عبد العظيم', 1700, '8209', 'GAC', 'GS3', 2024),
  ('mohamed abdalla', 1750, '5900', 'Bestune', 'T77 pro', 2023),
  ('hechem mejri', 0, '2773', 'Bestune', 'T77', 2023),
  ('mohamed boumahni', 1750, '7054', 'Bestune', 'T77 pro', 2023),
  ('mohamed amine chouchene', 0, '7058', 'Bestune', 'T77 pro', 2023),
  ('Badredine Khalfi', 2200, '847059', 'Ford', 'TERRITORY', 2023),
  ('omer omer', 0, '10670', 'changan', 'Alsvin', 2024),
  ('Mukhtar Ali Anayat UR RAHMAN', 0, '5898', 'Bestune', 'T77 pro', 2023),
  ('ABDELAZIZ JERFEL', 1500, '17216', 'Bestune', 'B70', 2023),
  ('ISSAM MZOUGHI', 1800, '7069', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '856715', 'Bestune', 'B70s', 2023),
  ('AHMED AKKAR', 2500, '335485', 'MG5', 'MG5', 2024),
  ('HOSSEM DHAHRI', 2100, '5901', 'Bestune', 'T77 pro', 2023),
  ('KHAfgfgfgfgMIS AL-JABOR', 2500, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('OLALEYE ALO', 0, '7040', 'Bestune', 'T77', 2023),
  ('ANWAR MOHAMED', 1300, '10172', 'Bestune', 'T33', 2022),
  ('snoonu snoonu', 0, '521207', 'MG5', 'MG5', 2024),
  ('KHAfgfgfgfgMIS AL-JABOR', 3000, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('ravi ravi', 2500, '848014', 'Ford', 'TERRITORY', 2023),
  ('ABUOBIDA BABIKER MOHAMED AHMED SIDDIG', 1800, '2784', 'Bestune', 'T77', 2023),
  ('faisal iqbal', 0, '856878', 'Bestune', 'B70s', 2023),
  ('محمود مازن محمود عباس', 1500, '234', 'testt', 'test', 2024),
  ('SIHEM BEN AHMED', 0, '754436', 'MG5', 'MG5', 2024),
  ('ATEF MANSOUR', 0, '7058', 'Bestune', 'T77 pro', 2023),
  ('MAHDI HOSNI', 2100, '846508', 'Ford', 'TERRITORY', 2023),
  ('mahmoud hassanein', 0, '7062', 'Bestune', 'T77 pro', 2023),
  ('زين العابدين ادريس', 1400, '9902', 'Bestune', 'T33', 2022),
  ('jabir desta', 1800, '7057', 'Bestune', 'T77 pro', 2023),
  ('MUHAMMAD GUL', 0, '10853', 'changan', 'Alsvin', 2024),
  ('abdelazim pro', 1200, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('ahmed MASGHOUNI', 0, '7043', 'Bestune', 'T77 pro', 2023),
  ('awuah baffour', 0, '521207', 'MG5', 'MG5', 2024),
  ('ATEF MANSOUR', 1850, '856925', 'Bestune', 'B70s', 2023),
  ('محمد إبراهيم', 1600, '7040', 'Bestune', 'T77', 2023),
  ('snoonu snoonu', 0, '711464', 'Bestune', 'B70', 2023),
  ('mohamed nawaz', 0, '2768', 'Bestune', 'T77', 2023),
  ('ala eddine hsin', 1200, '9255', 'Bestune', 'T33', 2022),
  ('KHAMIS AL-JABORrttttrrrr', 1500, '234', 'testt', 'test', 2024),
  ('HANENE JELASSI', 1300, '862165', 'Bestune', 'T33', 2022),
  ('عائشة سالم المري', 5000, '4015', 'GAC', 'GS3', 2024),
  ('AHMED BEN DHAOU', 0, '21849', 'Bestune', 'B70s', 2023),
  ('سيف الدولة عيسى', 1500, '2776', 'Bestune', 'T77', 2023),
  ('mohamed shikh', 0, '721440', 'Bestune', 'B70', 2023),
  ('يوسف سقام', 1700, '2778', 'Bestune', 'T77', 2023),
  ('nabil fargalla', 1700, '5898', 'Bestune', 'T77 pro', 2023),
  ('ravi ravi', 2268, '847987', 'Ford', 'TERRITORY', 2023),
  ('emmanuel darko', 0, '10664', 'changan', 'Alsvin', 2024),
  ('snoonu snoonu', 0, '746956', 'MG5', 'MG5', 2024),
  ('ZINELABIDINE BADRA', 0, '5891', 'Bestune', 'T77', 2023),
  ('ABDULRAHMAN ALGHAIATHI', 0, '5900', 'Bestune', 'T77 pro', 2023),
  ('faisal iqbal', 0, '9905', 'Bestune', 'T33', 2022),
  ('Mohammed Muslim', 2100, '7064', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '7053', 'Bestune', 'T77 pro', 2023),
  ('zied fares', 1240, '10176', 'Bestune', 'T33', 2022),
  ('YOUSSEF KHALILI', 1750, '7072', 'Bestune', 'T77 pro', 2023),
  ('تجربة ثانية', 1500, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('hosni maatallah', 0, '10174', 'Bestune', 'T33', 2022),
  ('MONCEF SAIBI', 0, '7074', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '8207', 'GAC', 'GS3', 2024),
  ('SOUFIANE BESSAOUDI', 0, '10851', 'changan', 'Alsvin', 2024),
  ('saeed al-hebabi', 0, '749762', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 0, '2770', 'Bestune', 'T77', 2023),
  ('Elsadigh Salih Ibrahim Diab', 1800, '185513', 'Bestune', 'T77', 2023),
  ('oussama` bouguerra', 0, '7054', 'Bestune', 'T77 pro', 2023),
  ('مؤمن علي سعيد', 1650, '856878', 'Bestune', 'B70s', 2023),
  ('ravi ravi', 2268, '847941', 'Ford', 'TERRITORY', 2023),
  ('ahmed babker', 2000, '5899', 'Bestune', 'T77 pro', 2023),
  ('Suman Kumar shah', 0, '2777', 'Bestune', 'T77', 2023),
  ('MOURAD BARHOUMI', 0, '751340', 'MG5', 'MG5', 2024),
  ('achraf saadaoui', 0, '646507', 'Bestune', 'B70', 2023),
  ('KHAfgfgfgfgMIS AL-JABOR', 7000, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('MAHDI HAMID', 1800, '7053', 'Bestune', 'T77 pro', 2023),
  ('mokhtar alil', 0, '7037', 'Bestune', 'T77 pro', 2023),
  ('awuah baffour', 1500, '10854', 'changan', 'Alsvin', 2024),
  ('KIBROM AREGAWI WELDEKIDAN', 1250, '10174', 'Bestune', 'T33', 2022),
  ('Abdemoniem ismail mahmoud Mohamed', 2100, '8206', 'GAC', 'GS3', 2024),
  ('snoonu snoonu', 0, '7073', 'Bestune', 'T77 pro', 2023),
  ('GIRISHKUMAR KARTHIKEYAN', 1900, '856878', 'Bestune', 'B70s', 2023),
  ('ismail mohamed', 1750, '2772', 'Bestune', 'T77', 2023),
  ('مهند حمود الظاهر', 1600, '7063', 'Bestune', 'T77 pro', 2023),
  ('ahmed elwasila', 1500, '10197', 'Bestune', 'T33', 2022),
  ('MOHAMED AMINE SALEM', 0, '10189', 'Bestune', 'T33', 2022),
  ('snoonu snoonu', 0, '7039', 'Bestune', 'T77 pro', 2023),
  ('prince nkansah', 0, '751340', 'MG5', 'MG5', 2024),
  ('KHAfgfgfgfgMIS AL-JABOR', 3000, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('shadrack saky', 0, '10668', 'changan', 'alsvin', 2024),
  ('radhwan mdini', 0, '893411', 'Bestune', 'B70', 2023),
  ('snoonu snoonu', 0, '381247', 'Bestune', 'B70', 2023),
  ('yosr chamkhi', 0, '556199', 'Bestune', 'B70', 2023),
  ('ABDELJALIL HATTACH', 0, '10669', 'changan', 'Alsvin', 2024),
  ('OASIM HALDER', 0, '821873', 'MG5', 'MG5', 2024),
  ('amir ben fredj', 0, '5895', 'Bestune', 'T77 pro', 2023),
  ('mohammed houssem dib', 0, '5894', 'Bestune', 'T77', 2023),
  ('مختار عليل', 1600, '2779', 'Bestune', 'T77', 2023),
  ('QFORCE SECURITY SERVICE', 57600, '548682', 'MG5', 'MG5', 2024),
  ('dtrgfgdfg', 1300, '8205', 'GAC', 'GS3', 2024),
  ('mustafa almustafa', 5400, '381247', 'Bestune', 'B70', 2023),
  ('snoonu snoonu', 0, '648144', 'Bestune', 'B70', 2023),
  ('mohamed ncibi', 1800, '739649', 'MG5', 'MG5', 2024),
  ('محمد علي سليم', 1500, '4014', 'GAC', 'GS3', 2024),
  ('RAFIK BELKACEM', 1600, '7040', 'Bestune', 'T77', 2023),
  ('AYMEN NASRA', 0, '10856', 'changan', 'Alsvin', 2024),
  ('موسى حيمر', 1600, '5891', 'Bestune', 'T77', 2023),
  ('mohamed elnakhli', 1250, '9999', 'Bestune', 'T33', 2022),
  ('abrar zaib', 0, '7039', 'Bestune', 'T77 pro', 2023),
  ('mouheb ouni', 0, '722134', 'Bestune', 'B70', 2023),
  ('CHIHEB HEDHLI', 64800, '857051', 'Bestune', 'B70s', 2023),
  ('KHAfgfgfgfgMIS AL-JABOR', 1500, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('saber dhibi', 1750, '2774', 'Bestune', 'T77', 2023),
  ('ahmed abdalla mahmoud abdalla mahmoud abdalla', 0, '2779', 'Bestune', 'T77', 2023),
  ('DEO SSENYANJA', 1280, '9891', 'Bestune', 'T33', 2022),
  ('azhari hakim khalid hakim', 1500, '7065', 'Bestune', 'T77 pro', 2023),
  ('salah masaad', 0, '548682', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 0, '893409', 'Bestune', 'B70', 2023),
  ('snoonu snoonu', 0, '725473', 'Bestune', 'B70', 2023),
  ('syed jan', 0, '2770', 'Bestune', 'T77', 2023),
  ('عبد اللله العلواني', 1600, '5894', 'Bestune', 'T77', 2023),
  ('snoonu snoonu', 0, '822389', 'MG5', 'MG5', 2024),
  ('MOHAMMAD ADNAN SWAID', 0, '8208', 'GAC', 'GS3', 2024),
  ('احمد عبدالله طاهر ادريس', 1750, '10665', 'changan', 'Alsvin', 2024),
  ('MOHAMMED ULLAH', 0, '10850', 'changan', 'Alsvin', 2024),
  ('فادي السعيدي', 1700, '21849', 'Bestune', 'B70s', 2023),
  ('achraf saadaoui', 1500, '10664', 'changan', 'Alsvin', 2024),
  ('HOSSEM DHAHRI 2', 2200, '846485', 'Ford', 'TERRITORY', 2023),
  ('abdelkader abdelkader', 0, '570468', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 0, '646507', 'Bestune', 'B70', 2023),
  ('mohamed ahmed', 0, '7041', 'Bestune', 'T77 pro', 2023),
  ('abduaziz almhauod', 0, '739649', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 0, '11473', 'Bestune', 'T33', 2022),
  ('abduaziz almhauod', 0, '856715', 'Bestune', 'B70s', 2023),
  ('snoonu snoonu', 0, '7072', 'Bestune', 'T77 pro', 2023),
  ('AHMED EDRISS', 1750, '10665', 'changan', 'Alsvin', 2024),
  ('هاني براهمي', 1600, '2774', 'Bestune', 'T77', 2023),
  ('Mohammad Haitham ettahar elhaddi mohamad', 1500, '7075', 'Bestune', 'T77 pro', 2023),
  ('Salih abdullah mohamed Ahmad', 2100, '2776', 'Bestune', 'T77', 2023),
  ('walid hassan', 1750, '2766', 'Bestune', 'T77', 2023),
  ('عبدالغفور درار', 1500, '2767', 'Bestune', 'T77', 2023),
  ('snoonu snoonu', 0, '556199', 'Bestune', 'B70', 2023),
  ('snoonu snoonu', 0, '7067', 'Bestune', 'T77 pro', 2023),
  ('AMIR EL MAHDI', 2300, '847099', 'Ford', 'TERRITORY', 2023),
  ('جاسم محمد الصالح', 1500, '10666', 'changan', 'Alsvin', 2024),
  ('ahmed elwasila', 0, '9905', 'Bestune', 'T33', 2022),
  ('عدنان محمد شودر', 1500, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('alaeddine dabech', 0, '7041', 'Bestune', 'T77 pro', 2023),
  ('mohamed ncibi', 0, '751340', 'MG5', 'MG5', 2024),
  ('SAIF ramzan', 0, '749403', 'MG5', 'MG5', 2024),
  ('emmanuel darko', 0, '10666', 'changan', 'Alsvin', 2024),
  ('sabri mbarki', 1800, '856589', 'Bestune', 'B70s', 2023),
  ('يوسف سقام', 1700, '2778', 'Bestune', 'T77', 2023),
  ('عبد المنعم', 1500, '10668', 'changan', 'alsvin', 2024),
  ('ABDALLA ABDALLA', 1600, '5897', 'Bestune', 'T77 pro', 2023),
  ('hakim kouas', 1750, '7063', 'Bestune', 'T77 pro', 2023),
  ('DEO SSENYANJA', 0, '10858', 'changan', 'Alsvin', 2024),
  ('tarek boutemedjet', 1750, '2770', 'Bestune', 'T77', 2023),
  ('ABDELLATIF ELHADAD', 0, '2783', 'Bestune', 'T77', 2023),
  ('MOHAMED CHOUCHENE', 1600, '7058', 'Bestune', 'T77 pro', 2023),
  ('muhammad mahmood', 0, '648144', 'Bestune', 'B70', 2023),
  ('snoonu snoonu', 0, '2777', 'Bestune', 'T77', 2023),
  ('ABDELAZIZ JERFEL', 1500, '5890', 'Bestune', 'T77 pro', 2023),
  ('Yassine Serhani', 2100, '2780', 'Bestune', 'T77', 2023),
  ('حسن محمد الفكي', 1600, '8212', 'GAC', 'GS3', 2024),
  ('ahmed ali mohamed bakhit', 0, '821873', 'MG5', 'MG5', 2024),
  ('Hamza Serunga', 0, '8205', 'GAC', 'GS3', 2024),
  ('tarek rahali', 0, '7074', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '335750', 'MG5', 'MG5', 2024),
  ('hamze hussein', 2000, '8208', 'GAC', 'GS3', 2024),
  ('علم الدين جمعة', 1500, '7056', 'Bestune', 'T77 pro', 2023),
  ('hakim kouas', 0, '754436', 'MG5', 'MG5', 2024),
  ('ahmed MASGHOUNI', 1800, '821873', 'MG5', 'MG5', 2024),
  ('marwen safsafi', 1250, '9905', 'Bestune', 'T33', 2022),
  ('MOHAMMED ABDALLAH', 1700, '8207', 'GAC', 'GS3', 2024),
  ('ABDUL AZIZ WAIGA', 2100, '8212', 'GAC', 'GS3', 2024),
  ('Abdelrahim Mohamed', 2100, '8213', 'GAC', 'GS3', 2024),
  ('snoonu snoonu', 0, '2769', 'Bestune', 'T77', 2023),
  ('YASSER SOLIMAN', 2100, '7068', 'Bestune', 'T77 pro', 2023),
  ('عبد الصمد بن عزوز', 1650, '893409', 'Bestune', 'B70', 2023),
  ('mahamoud maan dabboussi', 1450, '721894', 'Bestune', 'T33', 2022),
  ('HAMIDA BOUZIANE', 0, '721894', 'Bestune', 'T33', 2022),
  ('سفيان صالح', 1650, '556199', 'Bestune', 'B70', 2023),
  ('osmane mohamed', 2100, '7042', 'Bestune', 'T77 pro', 2023),
  ('KAMIL ALTAHIR', 0, '817009', 'MG5', 'MG5', 2024),
  ('عمر مراىحي', 1650, '7059', 'Bestune', 'T77 pro', 2023),
  ('mokhtar alil', 0, '2774', 'Bestune', 'T77', 2023),
  ('HAMZA YANES', 1750, '7043', 'Bestune', 'T77 pro', 2023),
  ('ABDELJALIL HATTACH', 0, '5896', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '185573', 'Bestune', 'T77', 2023),
  ('مصطفى  ساتي', 1700, '8213', 'GAC', 'GS3', 2024),
  ('AYMEN NASRA', 0, '2779', 'Bestune', 'T77', 2023),
  ('mohammed awad', 1700, '725473', 'Bestune', 'B70', 2023),
  ('waddah elobaid', 1500, '2769', 'Bestune', 'T77', 2023),
  ('radhwan mdini', 0, '893411', 'Bestune', 'B70', 2023),
  ('sead logomo', 0, '754436', 'MG5', 'MG5', 2024),
  ('richard asiedu', 0, '335485', 'MG5', 'MG5', 2024),
  ('ahmad salah', 0, '5894', 'Bestune', 'T77', 2023),
  ('KHAfgfgfgfgMIS AL-JABOR', 3000, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('baligh ben amor', 0, '2769', 'Bestune', 'T77', 2023),
  ('ADAM SALIH G. MOHAMED', 2100, '7077', 'Bestune', 'T77', 2023),
  ('يحيى احمد عبدالرحمن', 1700, '756104', 'MG5', 'MG5', 2024),
  ('Sofiene Ben salah', 0, '7058', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '5894', 'Bestune', 'T77', 2023),
  ('Mouheb Gandouzi', 0, '8203', 'GAC', 'GS3', 2024),
  ('QFORCE SECURITY SERVICE', 57600, '335750', 'MG5', 'MG5', 2024),
  ('aurangzeb din', 0, '10849', 'changan', 'Alsvin', 2024),
  ('Abdelrahim Mohamed', 1253, '9890', 'Bestune', 'T33', 2022),
  ('mohammad ismail', 0, '5899', 'Bestune', 'T77 pro', 2023),
  ('ameer zaib', 0, '5893', 'Bestune', 'T77 pro', 2023),
  ('حسان بو علاق', 1700, '856718', 'Bestune', 'B70s', 2023),
  ('KHAfgfgfgfgMIS AL-JABOR', 5000, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('MUHAMMAD S.M.M KHALIFA', 0, '7070', 'Bestune', 'T77 pro', 2023),
  ('mohanad aldaher', 1600, '2777', 'Bestune', 'T77', 2023),
  ('lukman dramani', 0, '10855', 'changan', 'Alsvin', 2024),
  ('Mazyad Saab', 0, '7069', 'Bestune', 'T77 pro', 2023),
  ('عبد العزيز علي', 1500, '2768', 'Bestune', 'T77', 2023),
  ('ABDELAZIZ JERFEL', 0, '2778', 'Bestune', 'T77', 2023),
  ('محمود مازن محمود عباس', 1500, '7055', 'Bestune', 'T77 pro', 2023),
  ('omar hmem', 0, '5893', 'Bestune', 'T77 pro', 2023),
  ('يوسف قابل', 1500, '2773', 'Bestune', 'T77', 2023),
  ('ثامر محمد', 2000, '7038', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '7071', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '2768', 'Bestune', 'T77', 2023),
  ('mohamed noomani', 0, '5890', 'Bestune', 'T77 pro', 2023),
  ('emad bhagil', 1700, '185573', 'Bestune', 'T77', 2023),
  ('مختارالامين', 1500, '5896', 'Bestune', 'T77 pro', 2023),
  ('Abdelrahim Mohamed', 2100, '4018', 'GAC', 'GS3', 2024),
  ('lukman dramani', 0, '7065', 'Bestune', 'T77 pro', 2023),
  ('MOHAMED AHMED', 1800, '7056', 'Bestune', 'T77 pro', 2023),
  ('amjid wadan', 0, '7043', 'Bestune', 'T77 pro', 2023),
  ('HANY HUSHAM', 0, '857051', 'Bestune', 'B70s', 2023),
  ('مجدي بخيت', 1500, '2773', 'Bestune', 'T77', 2023),
  ('سامي عبد الله', 1700, '4016', 'GAC', 'GS3', 2024),
  ('tarak tunisia', 0, '7078', 'Bestune', 'T77 pro', 2023),
  ('tarak hamlet', 350, '9894', 'Bestune', 'T33', 2022),
  ('imed ayari', 1250, '11473', 'Bestune', 'T33', 2022),
  ('AMMAR GHOZY', 1750, '893410', 'Bestune', 'B70', 2023),
  ('ADIL ABDELKARIM', 1750, '7067', 'Bestune', 'T77 pro', 2023),
  ('zafar ullah badshah', 0, '741277', 'MG5', 'MG5', 2024),
  ('Ghazi Emmad ben meddeb', 0, '7034', 'Bestune', 'T77 pro', 2023),
  ('محمد عبد الله سلمان', 1400, '862165', 'Bestune', 'T33', 2022),
  ('RIZWAN BAHADAR', 0, '749762', 'MG5', 'MG5', 2024),
  ('MUHAMMAD GUL', 0, '746956', 'MG5', 'MG5', 2024),
  ('ahmed elwasila', 1250, '10189', 'Bestune', 'T33', 2022),
  ('ahmed ali mawlod abdalla', 1800, '4016', 'GAC', 'GS3', 2024),
  ('احمد عبدالله محمد', 1550, '7041', 'Bestune', 'T77 pro', 2023),
  ('Zyed Yahmadi', 1800, '8214', 'GAC', 'GS3', 2024),
  ('KHAMIS AL-JABOReeee', 2500, '234', 'testt', 'test', 2024),
  ('shadrack saky', 0, '749403', 'MG5', 'MG5', 2024),
  ('فادي السعيدي', 1700, '856715', 'Bestune', 'B70s', 2023),
  ('KOSAY HAMMAMI', 0, '10197', 'Bestune', 'T33', 2022),
  ('محمد محمد احمد', 1650, '2766', 'Bestune', 'T77', 2023),
  ('mokhtar alil', 0, '893410', 'Bestune', 'B70', 2023),
  ('amir ben fredj', 0, '2773', 'Bestune', 'T77', 2023),
  ('awol ibrahim', 0, '10669', 'changan', 'Alsvin', 2024),
  ('محمد العويني', 1600, '21860', 'Bestune', 'B70s', 2023),
  ('prince boateng', 0, '746956', 'MG5', 'MG5', 2024),
  ('samuel yeboah', 0, '754436', 'MG5', 'MG5', 2024),
  ('josef ado', 0, '10855', 'changan', 'Alsvin', 2024),
  ('Mohammad ibrar Abdul hanan', 0, '8208', 'GAC', 'GS3', 2024),
  ('KHAMIS AL-JABOReeee', 1500, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('emmanuel darko', 0, '10064', 'Bestune', 'T33', 2022),
  ('mahmoud jassem alsaleh', 0, '2769', 'Bestune', 'T77', 2023),
  ('hany mohamed', 0, '8208', 'GAC', 'GS3', 2024),
  ('Hamza BADOU', 1060, '676281', 'Bestune', 'B70', 2023),
  ('EIHAB ABDALLA', 1786, '856715', 'Bestune', 'B70s', 2023),
  ('sead logomo', 0, '749403', 'MG5', 'MG5', 2024),
  ('mohamed yousif', 1650, '10669', 'changan', 'Alsvin', 2024),
  ('snoonu snoonu', 0, '706150', 'Bestune', 'B70', 2023),
  ('ahmed arsheen', 1800, '756104', 'MG5', 'MG5', 2024),
  ('VARUN KUMAR C CHAUHAN', 0, '856925', 'Bestune', 'B70s', 2023),
  ('snoonu snoonu', 0, '751340', 'MG5', 'MG5', 2024),
  ('عبد الله برهام', 1600, '7039', 'Bestune', 'T77 pro', 2023),
  ('قسورة عبد الرحيم', 1500, '10858', 'changan', 'Alsvin', 2024),
  ('ravi ravi', 2268, '847932', 'Ford', 'TERRITORY', 2023),
  ('yahia sakhri', 0, '7062', 'Bestune', 'T77 pro', 2023),
  ('علاء الدين بوزيان', 1500, '10856', 'changan', 'Alsvin', 2024),
  ('Haq Nawaz Rahim Bakhsh', 0, '8204', 'GAC', 'GS3', 2024),
  ('mahmoud jassem alsaleh', 1500, '7074', 'Bestune', 'T77 pro', 2023),
  ('clement gyamerah', 0, '819027', 'MG5', 'MG5', 2024),
  ('abdelazim pro', 1200, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('hamdi thabet', 1260, '722134', 'Bestune', 'B70', 2023),
  ('olusegun onadairo', 0, '7062', 'Bestune', 'T77 pro', 2023),
  ('AMARA KHARROUBI', 2100, '857045', 'Bestune', 'B70s', 2023),
  ('مؤسى حيمر', 1600, '5891', 'Bestune', 'T77', 2023),
  ('mohamed abdalla', 0, '648144', 'Bestune', 'B70', 2023),
  ('WALID CHOURABI', 2100, '846560', 'Ford', 'TERRITORY', 2023),
  ('Abdulhanna abulhashem', 2100, '7061', 'Bestune', 'T77', 2023),
  ('ALI ABBAS', 0, '5898', 'Bestune', 'T77 pro', 2023),
  ('saddam el falah', 0, '906077', 'Bestune', 'T99', 2023),
  ('snoonu snoonu', 0, '893410', 'Bestune', 'B70', 2023),
  ('HABIB KHELIFI', 2000, '8204', 'GAC', 'GS3', 2024),
  ('tarek boutemedjet', 0, '862169', 'Bestune', 'T33', 2022),
  ('mubarek golcha', 0, '570468', 'MG5', 'MG5', 2024),
  ('KHAfgfgfgfgMIS AL-JABOR', 5000, 'TEST-123', 'Toyota', 'Camry', 2023),
  ('kaies ayari', 0, '754436', 'MG5', 'MG5', 2024),
  ('ماهر مهيري', 1600, '2771', 'Bestune', 'T77', 2023),
  ('snoonu snoonu', 0, '2781', 'Bestune', 'T77', 2023),
  ('foster ngo', 0, '816508', 'MG5', 'MG5', 2024),
  ('hamze hussein', 0, '817009', 'MG5', 'MG5', 2024),
  ('زين العابدين ادريس', 1400, '9902', 'Bestune', 'T33', 2022),
  ('wassim chatmen', 1050, '10064', 'Bestune', 'T33', 2022),
  ('mohamed ahmed', 0, '711289', 'Bestune', 'B70', 2023),
  ('MEDHAT BAKRY', 0, '21849', 'Bestune', 'B70s', 2023),
  ('KHALIL CHMENGUI', 0, '9999', 'Bestune', 'T33', 2022),
  ('almunzer ali', 0, '7056', 'Bestune', 'T77 pro', 2023),
  ('prince boateng', 0, '10858', 'changan', 'Alsvin', 2024),
  ('ABUELMAALI ISMAIL', 1700, '7078', 'Bestune', 'T77 pro', 2023),
  ('Awad el karim Abdelmonim', 2525, '7066', 'Bestune', 'T77 pro', 2023),
  ('snoonu snoonu', 0, '721440', 'Bestune', 'B70', 2023),
  ('Sofiene Ben salah', 0, '10854', 'changan', 'Alsvin', 2024),
  ('fatima akka', 0, '862165', 'Bestune', 'T33', 2022),
  ('riaz khan', 0, '7057', 'Bestune', 'T77 pro', 2023),
  ('Saif ur rehman mohammad Ramzan', 0, '7072', 'Bestune', 'T77 pro', 2023),
  ('mohamed hassen omer mohamed', 0, '4016', 'GAC', 'GS3', 2024),
  ('snoonu snoonu', 0, '2782', 'Bestune', 'T77', 2023),
  ('HICHEM ABDERAHIM', 0, '7035', 'Bestune', 'T77 pro', 2023),
  ('issam hamdani', 75600, '7076', 'Bestune', 'T77 pro', 2023),
  ('MOJEEB AMIN', 1750, '7035', 'Bestune', 'T77 pro', 2023),
  ('ANOUER MATHLOUTHI', 0, '557098', 'MG5', 'MG5', 2024),
  ('snoonu snoonu', 1600, '10666', 'changan', 'Alsvin', 2024),
  ('بسام فتحي اللوز', 1700, '7057', 'Bestune', 'T77 pro', 2023),
  ('atef sghairi', 2000, '5888', 'Bestune', 'T77 pro', 2023),
  ('تجربة ثانية', 2500, '234', 'testt', 'test', 2024),
  ('أنور جنبيني', 1600, '2775', 'Bestune', 'T77', 2023),
  ('abdul basit khan', 0, '7041', 'Bestune', 'T77 pro', 2023),
  ('saeed al-hebabi', 1800, '21860', 'Bestune', 'B70s', 2023),
  ('ganga chaudhary', 1300, '10672', 'changan', 'Alsvin', 2024),
  ('SAID HILALI', 345, '21875', 'Bestune', 'T33', 2022),
  ('snoonu snoonu', 0, '10171', 'Bestune', 'T33', 2022);

-- ================================================================
-- STAGE 3: Smart matching and update
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_matched INTEGER := 0;
  v_updated INTEGER := 0;
  v_rec RECORD;
  v_progress INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '🧠 SMART MATCHING: Processing 415 agreements';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  
  FOR v_rec IN SELECT * FROM temp_agreements_full
  LOOP
    v_progress := v_progress + 1;
    
    -- Smart matching
    UPDATE contracts c
    SET 
      license_plate = v_rec.license_plate,
      make = v_rec.make,
      model = v_rec.model,
      year = v_rec.year,
      updated_at = NOW()
    FROM customers cust
    WHERE c.customer_id = cust.id
      AND c.company_id = v_company_id
      AND (c.license_plate IS NULL OR TRIM(c.license_plate) = '')
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
      );
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated > 0 THEN
      v_matched := v_matched + v_updated;
    END IF;
    
    -- Progress every 50 records
    IF v_progress % 50 = 0 THEN
      RAISE NOTICE '   Progress: % / 415 processed...', v_progress;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total contracts matched: %', v_matched;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- STAGE 4: Create vehicles
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_created INTEGER := 0;
BEGIN
  RAISE NOTICE '🚗 Creating missing vehicles...';
  
  INSERT INTO vehicles (
    company_id,
    plate_number,
    make,
    model,
    year,
    status,
    created_at,
    updated_at
  )
  SELECT DISTINCT ON (TRIM(c.license_plate))
    v_company_id,
    TRIM(c.license_plate),
    TRIM(c.make),
    TRIM(c.model),
    c.year,
    'rented'::vehicle_status,
    NOW(),
    NOW()
  FROM contracts c
  WHERE c.company_id = v_company_id
    AND c.license_plate IS NOT NULL
    AND TRIM(c.license_plate) != ''
    AND NOT EXISTS (
      SELECT 1 FROM vehicles v 
      WHERE v.company_id = v_company_id 
        AND TRIM(v.plate_number) = TRIM(c.license_plate)
    )
  ON CONFLICT (company_id, plate_number) DO NOTHING;
  
  GET DIAGNOSTICS v_created = ROW_COUNT;
  RAISE NOTICE '✅ Created % new vehicles', v_created;
  RAISE NOTICE '';
END $$;

-- ================================================================
-- STAGE 5: Link contracts to vehicles
-- ================================================================
DO $$
DECLARE
  v_company_id UUID := '24bc0b21-4e2d-4413-9842-31719a3669f4';
  v_linked INTEGER := 0;
BEGIN
  RAISE NOTICE '🔗 Linking contracts to vehicles...';
  
  UPDATE contracts c
  SET 
    vehicle_id = v.id,
    updated_at = NOW()
  FROM vehicles v
  WHERE c.company_id = v_company_id
    AND c.vehicle_id IS NULL
    AND c.license_plate IS NOT NULL
    AND TRIM(c.license_plate) != ''
    AND v.company_id = v_company_id
    AND TRIM(v.plate_number) = TRIM(c.license_plate);
  
  GET DIAGNOSTICS v_linked = ROW_COUNT;
  RAISE NOTICE '✅ Linked % contracts to vehicles', v_linked;
  RAISE NOTICE '';
END $$;

-- ================================================================
-- FINAL VERIFICATION
-- ================================================================

-- Check CNT-25-0479 specifically
SELECT 
  '🎯 CONTRACT CNT-25-0479 - FINAL STATUS' as title,
  c.contract_number,
  cust.first_name_ar as customer,
  c.license_plate,
  c.make,
  c.model,
  c.year,
  c.monthly_amount as rent,
  c.vehicle_id,
  v.plate_number as vehicle_plate,
  CASE 
    WHEN c.vehicle_id IS NOT NULL THEN '🎉 SUCCESS! HAS VEHICLE!'
    WHEN c.license_plate IS NOT NULL THEN '⚠️ Has data but not linked'
    ELSE '❌ No vehicle data'
  END as final_status
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
LEFT JOIN vehicles v ON v.id = c.vehicle_id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.contract_number = 'CNT-25-0479';

-- Overall statistics
SELECT 
  '📊 Overall Statistics' as report,
  COUNT(*) as total_contracts,
  COUNT(*) FILTER (WHERE license_plate IS NOT NULL) as with_vehicle_data,
  COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL) as linked_to_vehicles,
  ROUND(COUNT(*) FILTER (WHERE vehicle_id IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) || '%' as success_rate
FROM contracts
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Sample of matched contracts
SELECT 
  '✅ Sample Matched Contracts (Top 10)' as section,
  c.contract_number,
  cust.first_name_ar as customer,
  c.license_plate,
  c.make || ' ' || c.model as vehicle,
  CASE WHEN c.vehicle_id IS NOT NULL THEN '✅' ELSE '⚠️' END as linked
FROM contracts c
LEFT JOIN customers cust ON cust.id = c.customer_id
WHERE c.company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND c.license_plate IS NOT NULL
ORDER BY c.updated_at DESC
LIMIT 10;

-- Clean up
DROP TABLE IF EXISTS temp_agreements_full;
