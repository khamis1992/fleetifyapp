-- ================================================================
-- SMART UPDATE: Customer Phone & Civil ID
-- ================================================================
-- Auto-generated from agreements_with_details.sql
-- Total records: 348
-- Matching strategy: Customer Name (fuzzy match)
-- Updates: phone, civil_id/driver_license_number
-- ================================================================

-- ================================================================
-- STAGE 1: Create temp table with customer data
-- ================================================================
DROP TABLE IF EXISTS temp_customer_data;

CREATE TEMP TABLE temp_customer_data (
  customer_name TEXT,
  email TEXT,
  phone TEXT,
  civil_id TEXT
);

-- Insert all customer data
INSERT INTO temp_customer_data (customer_name, email, phone, civil_id) VALUES
  ('issam abdallah', NULL, '97430777645', '28778801222'),
  ('MEHRAN TABIB TABIB HUSSAIN', NULL, '97433648377', '29658607460'),
  ('AHMED BEN DHAOU', NULL, '97466607498', '28878802556'),
  ('haythem souissi', NULL, '97471310005', '29778800177'),
  ('bannour rekaia', NULL, '97430743344', '29678800942'),
  ('AHMED ABBAS ELDAWO ELHASHMI', NULL, '97470476000', '29073602131'),
  ('frank williams', NULL, '97430488852', '29628800924'),
  ('marwen safsafi', NULL, '97471886388', '28978800935'),
  ('hassan sharif', NULL, '97430033188', '29473602430'),
  ('abdelghani abboud', NULL, '97430504430', '27678001539'),
  ('احمد جمعة', NULL, '97430060107', '29001200033'),
  ('said chenouf', NULL, '97455992530', '29050401163'),
  ('Mohammed ali Fetoui', NULL, '97433779853', '28278801203'),
  ('faisal iqbal', NULL, '97430158700', '29658606320'),
  ('عبد الغفور درار', NULL, '97477122519', '29501201171'),
  ('MOHAMED AMINE SALEM', NULL, '97471105390', '29678801847'),
  ('haytham zarrouk', NULL, '97466406305', '29278802242'),
  ('kaies ayari', NULL, '97430109102', '28378801754'),
  ('شرفي عبد الله', NULL, '97477517797', '28273601464'),
  ('SOUFIANE BESSAOUDI', NULL, '97450792055', '28301200481'),
  ('محمد عبد الله سلمان', '''fleetalarraf@gmail.com''', '97455554627', '28773600707'),
  ('AYMEN HAMADI', NULL, '97430305808', '29478802235'),
  ('Nacer Lahcene', NULL, '97455064714', '29301200757'),
  ('mahdi yousif', NULL, '97433670129', '27273601103'),
  ('yahia sakhri', NULL, '97450447989', '29778801907'),
  ('raphael denu', NULL, '97430316583', '28328800926'),
  ('issam abdallah', NULL, '97430777645', '28778801222'),
  ('EIHAB ABDALLA', NULL, '97474488904', '26373600792'),
  ('MAMOUN AHMED', NULL, '97430034843', '26973601348'),
  ('عبد الحميد عترون', NULL, '97450643428', '28801200759'),
  ('MUHAMMAD ALI KHALID', NULL, '97450584650', '29158608000'),
  ('ahmed fadil', NULL, '97455935204', '29050401516'),
  ('اسلام عثمان محمدين', NULL, '97455025546', '29408000183'),
  ('eric naiko', NULL, '97430636173', '29428801254'),
  ('MOHAMED AMINE SALEM', NULL, '97471105390', '29678801847'),
  ('حسان بو علاق', '''demo@gmail.com''', '66553638', '30078800270'),
  ('imran farhad', NULL, '97477292398', '30358603904'),
  ('ZAINUDEEN MOHAMED IZADEEN', NULL, '97455020544', '25914401933'),
  ('marwen safsafi', NULL, '97471886388', '28978800935'),
  ('ياسر الصادق القاسم', NULL, '97455990635', '29673601272'),
  ('كبيروم العرجاوي ولدكيدان', '''demo@gmail.com''', '30796407', '28423003423'),
  ('saidi ababa', NULL, '97455945485', '29480000069'),
  ('SAYED I.A ELSAYED', NULL, '97455058031', '27781808987'),
  ('mounir lechelache', NULL, '97470883509', '28901200612'),
  ('محمد جاسم صالح', NULL, '97466684460', '27376000417'),
  ('OSAMA GRESS', NULL, '70381387', '27273601418'),
  ('MOTAZ ABOSHABA', NULL, '97439932355', '28873603341'),
  ('tamer el sayed', NULL, '97430067536', '27981811596'),
  ('Elsadigh Salih Ibrahim Diab', NULL, '97470075544', '29173602216'),
  ('ahmed babiker ahmed', NULL, '97430933229', '29773603973'),
  ('إبراهيم يعقوب', NULL, '97430882244', '27973601677'),
  ('عصام احمداحمد', NULL, '97466276263', '27981803187'),
  ('ALI SALIM MZITA', NULL, '97455089148', '28478801464'),
  ('aliyu umar', NULL, '97466424774', '28856600730'),
  ('soufiane allaoua', NULL, '97466197941', '30101200116'),
  ('tarek rahali', NULL, '97430762577', '29478802505'),
  ('mohamed amine chouchene', NULL, '97431435988', '28978801418'),
  ('محمد العويني', '''demo@gmail.com''', '668168169', '29350401869'),
  ('saeed al-hebabi', NULL, '97433333971', '28663402985'),
  ('AHMED BEN DHAOU', NULL, '97466607498', '28878802556'),
  ('عمار الشيخ', NULL, '97433386066', '28973603135'),
  ('RECEP KART', NULL, '97474462697', '29279200028'),
  ('HOUSSIN HENI', NULL, '97433111067', '29378801285'),
  ('Mohamed Hathroubi', NULL, '97470713088', '29078801183'),
  ('mohamed shikh', NULL, '97470075026', '29205000769'),
  ('AHMED ABBAS ELDAWO ELHASHMI', NULL, '97470476000', '29073602131'),
  ('HAMZA ZIDI', NULL, '97466440580', '29278801971'),
  ('إيهاب عبد الله', NULL, '97431009664', '28573602823'),
  ('KHAMfffffffIS AL-JABOR', '''khamffffffis-1992@hotmail.com''', '97466777063', '12345425256'),
  ('abdulla al-shahri', NULL, '97433933920', '26563400601'),
  ('يحيى عبد الرحمان', NULL, '97430757943', '29442200753'),
  ('chrisus arinaitwe', NULL, '97474459955', '29680001473'),
  ('هشام عبد العظيم', NULL, '97431009664', '28573602823'),
  ('mohamed abdalla', NULL, '97470083881', '30173601086'),
  ('hechem mejri', NULL, '97470209573', '30078800801'),
  ('mohamed boumahni', NULL, '97470890200', '30301200316'),
  ('mohamed amine chouchene', NULL, '97431435988', '28978801418'),
  ('Badredine Khalfi', NULL, '97477754754', '29278801950'),
  ('omer omer', NULL, '97450575500', '28873602172'),
  ('ABDELAZIZ JERFEL', NULL, '97433767961', '29278800776'),
  ('ISSAM MZOUGHI', NULL, '97474700503', '28078801264'),
  ('AHMED AKKAR', NULL, '97433326546', '28673601543'),
  ('HOSSEM DHAHRI', NULL, '97471375054', '29778800219'),
  ('KHAfgfgfgfgMIS AL-JABOR', '''khafggfgfgmis-1992@hotmail.com''', '97466777763', '23456'),
  ('OLALEYE ALO', NULL, '97477998806', '2865600140'),
  ('ANWAR MOHAMED', NULL, '97470561365', '27573600311'),
  ('KHAfgfgfgfgMIS AL-JABOR', '''khafggfgfgmis-1992@hotmail.com''', '97466777763', '23456'),
  ('ABUOBIDA BABIKER MOHAMED AHMED SIDDIG', NULL, '97455653223', '28173602059'),
  ('faisal iqbal', NULL, '97430158700', '29658606320'),
  ('محمود مازن محمود عباس', NULL, '97444757578', '28940000328'),
  ('SIHEM BEN AHMED', NULL, '97430177100', '28778802028'),
  ('ATEF MANSOUR', NULL, '97474446588', '28181802312'),
  ('MAHDI HOSNI', NULL, '97430180684', '28078800388'),
  ('mahmoud hassanein', NULL, '97466404489', '28581801082'),
  ('زين العابدين ادريس', '''fleetalarraf@gmail.com''', '97470897519', '29773601765'),
  ('jabir desta', NULL, '97477069310', '28623003448'),
  ('MUHAMMAD GUL', NULL, '97451145953', '29358608980'),
  ('ahmed MASGHOUNI', NULL, '97433340971', '30378800441'),
  ('awuah baffour', NULL, '97433326932', '28128800591'),
  ('ATEF MANSOUR', NULL, '97474446588', '28181802312'),
  ('محمد إبراهيم', NULL, '97450506797', '29173600826'),
  ('ala eddine hsin', NULL, '97477456439', '29378802213'),
  ('KHAMIS AL-JABORrttttrrrr', '''khafgfgfgfgmis-1992@hotmail.com''', '97466222063', '123456'),
  ('HANENE JELASSI', NULL, '97450533032', '28178801085'),
  ('عائشة سالم المري', '''aisha.marri@example.com''', '97466654321', 'DL567890'),
  ('AHMED BEN DHAOU', NULL, '97466607498', '28878802556'),
  ('سيف الدولة عيسى', '''test@test.com''', '97474033341', '28273602377'),
  ('mohamed shikh', NULL, '97470075026', '29205000769'),
  ('يوسف سقام', '''youssef@gmail.com''', '33721869', '29350401869'),
  ('nabil fargalla', NULL, '97431184659', '27173600607'),
  ('emmanuel darko', NULL, '97471581990', '29028801637'),
  ('ZINELABIDINE BADRA', NULL, '97431207465', '29501200270'),
  ('ABDULRAHMAN ALGHAIATHI', NULL, '97455771800', '29988600543'),
  ('faisal iqbal', NULL, '97430158700', '29658606320'),
  ('Mohammed Muslim', NULL, '97455958782', '30573600163'),
  ('zied fares', NULL, '97450115847', '29178802357'),
  ('YOUSSEF KHALILI', NULL, '97472119703', '29678801302'),
  ('تجربة ثانية', '''khadffgfgfgmis-1992@hotmail.com''', '97454745684', '23456'),
  ('hosni maatallah', NULL, '97470059300', '29378801113'),
  ('MONCEF SAIBI', NULL, '97433784834', '27578800269'),
  ('SOUFIANE BESSAOUDI', NULL, '97450792055', '28301200481'),
  ('saeed al-hebabi', NULL, '97433333971', '28663402985'),
  ('Elsadigh Salih Ibrahim Diab', NULL, '97470075544', '29173602216'),
  ('oussama` bouguerra', NULL, '97470209653', '29878801376'),
  ('مؤمن علي سعيد', NULL, '97474024205', '29173600212'),
  ('ahmed babker', NULL, '97433081277', '27973601538'),
  ('Suman Kumar shah', NULL, '97471302739', '30152409921'),
  ('MOURAD BARHOUMI', NULL, '97430566445', '28278801032'),
  ('achraf saadaoui', NULL, '97455165658', '28978802393'),
  ('KHAfgfgfgfgMIS AL-JABOR', '''khafggfgfgmis-1992@hotmail.com''', '97466777763', '23456'),
  ('MAHDI HAMID', NULL, '97430138501', '29873600511'),
  ('mokhtar alil', NULL, '97477907750', '29450401278'),
  ('awuah baffour', NULL, '97433326932', '28128800591'),
  ('KIBROM AREGAWI WELDEKIDAN', NULL, '97430796407', '28423003423'),
  ('Abdemoniem ismail mahmoud Mohamed', NULL, '97477884170', '26373601125'),
  ('GIRISHKUMAR KARTHIKEYAN', NULL, '97433389695', '28035629580'),
  ('ismail mohamed', NULL, '97430400511', '29073602014'),
  ('مهند حمود الظاهر', '''test@test.com''', '97430623322', '29076000589'),
  ('ahmed elwasila', NULL, '97450118063', '27773601703'),
  ('MOHAMED AMINE SALEM', NULL, '97471105390', '29678801847'),
  ('prince nkansah', NULL, '50131833', '28728801133'),
  ('KHAfgfgfgfgMIS AL-JABOR', '''khafggfgfgmis-1992@hotmail.com''', '97466777763', '23456'),
  ('shadrack saky', NULL, '97455076981', '29428801276'),
  ('radhwan mdini', NULL, '97430004696', '29178801863'),
  ('yosr chamkhi', NULL, '97431008858', '27978800933'),
  ('ABDELJALIL HATTACH', NULL, '97450623375', '27350400455'),
  ('OASIM HALDER', NULL, '97450088482', '29005012946'),
  ('amir ben fredj', NULL, '97466172920', '30078800658'),
  ('mohammed houssem dib', NULL, '97472034609', '29101200887'),
  ('مختار عليل', NULL, '97477227716', '29450401278'),
  ('QFORCE SECURITY SERVICE', NULL, '97450446192', '25963400049'),
  ('mustafa almustafa', NULL, '97470555993', '28373600666'),
  ('mohamed ncibi', NULL, '97466918182', '29878801552'),
  ('محمد علي سليم', '''fleetalarraf@gmail.com''', '97430797703', '29778801843'),
  ('RAFIK BELKACEM', NULL, '31215469', '28901200576'),
  ('AYMEN NASRA', NULL, '97450171785', '28178801373'),
  ('موسى حيمر', NULL, '97471503673', '29701201023'),
  ('mohamed elnakhli', NULL, '97433781937', '27073600475'),
  ('abrar zaib', NULL, '97439989880', '28658602714'),
  ('CHIHEB HEDHLI', NULL, '97430586471', '29278802454'),
  ('KHAfgfgfgfgMIS AL-JABOR', '''khafggfgfgmis-1992@hotmail.com''', '97466777763', '23456'),
  ('saber dhibi', NULL, '97451076544', '28978802442'),
  ('ahmed abdalla mahmoud abdalla mahmoud abdalla', NULL, '97466230309', '28273602091'),
  ('DEO SSENYANJA', NULL, '97455984233', '28780000274'),
  ('azhari hakim khalid hakim', NULL, '9745578515', '25873600219'),
  ('salah masaad', NULL, '97466104053', '27573601722'),
  ('syed jan', NULL, '97471027960', '29135652124'),
  ('عبد اللله العلواني', NULL, '97470897519', '29878801126'),
  ('MOHAMMAD ADNAN SWAID', NULL, '97431103801', '29542201148'),
  ('احمد عبدالله طاهر ادريس', '''a@a.com''', '97477013644', '29573602552'),
  ('MOHAMMED ULLAH', NULL, '97477579524', '29105005125'),
  ('فادي السعيدي', NULL, '97466043445', '29778800257'),
  ('achraf saadaoui', NULL, '97455165658', '28978802393'),
  ('HOSSEM DHAHRI 2', NULL, '97431115657', '29778800219'),
  ('mohamed ahmed', NULL, '97455304449', '26373601256'),
  ('AHMED EDRISS', NULL, '97477013644', '29573602552'),
  ('هاني براهمي', NULL, '97466521616', '29978801488'),
  ('Mohammad Haitham ettahar elhaddi mohamad', NULL, '97450446192', '27673601350'),
  ('Salih abdullah mohamed Ahmad', NULL, '97455339605', '27573600307'),
  ('walid hassan', NULL, '97477439393', '26973600288'),
  ('عبدالغفور درار', '''demo@gmail.com''', '77122519', '29501201171'),
  ('AMIR EL MAHDI', NULL, '97433734751', '27273600742'),
  ('جاسم محمد الصالح', '''gasemalsalh11@gmail.com''', '97430047797', '30276001052'),
  ('ahmed elwasila', NULL, '97450118063', '27773601703'),
  ('عدنان محمد شودر', NULL, '97455747458', '30829205000'),
  ('alaeddine dabech', NULL, '97471146699', '30178800322'),
  ('mohamed ncibi', NULL, '97466918182', '29878801552'),
  ('SAIF ramzan', NULL, '97431466795', '27358603920'),
  ('emmanuel darko', NULL, '97471581990', '29028801637'),
  ('sabri mbarki', NULL, '97455133110', '28978800362'),
  ('يوسف سقام', '''youssef@gmail.com''', '33721869', '29350401869'),
  ('عبد المنعم', NULL, '97470184904', '28408000256'),
  ('ABDALLA ABDALLA', NULL, '97433079976', '29673601398'),
  ('hakim kouas', NULL, '97466230309', '29278801788'),
  ('DEO SSENYANJA', NULL, '97455984233', '28780000274'),
  ('tarek boutemedjet', NULL, '97455039533', '27801200137'),
  ('ABDELLATIF ELHADAD', NULL, '97477710585', '26781803285'),
  ('MOHAMED CHOUCHENE', NULL, '97455146823', '28678802468'),
  ('muhammad mahmood', NULL, '97470715743', '29258608967'),
  ('ABDELAZIZ JERFEL', NULL, '97433767961', '29278800776'),
  ('Yassine Serhani', NULL, '97474778109', '29878800584'),
  ('حسن محمد الفكي', NULL, '97450055884', '30173603044'),
  ('ahmed ali mohamed bakhit', NULL, '97477160274', '29473604002'),
  ('Hamza Serunga', NULL, '97450795709', '28680000504'),
  ('tarek rahali', NULL, '97430762577', '29478802505'),
  ('hamze hussein', NULL, '97471348615', '30042200722'),
  ('علم الدين جمعة', NULL, '97466188278', '29673604664'),
  ('hakim kouas', NULL, '97466230309', '29278801788'),
  ('ahmed MASGHOUNI', NULL, '97433340971', '30378800441'),
  ('marwen safsafi', NULL, '97471886388', '28978800935'),
  ('MOHAMMED ABDALLAH', NULL, '97450200224', '29473603596'),
  ('ABDUL AZIZ WAIGA', NULL, '97433347242', '28246600015'),
  ('Abdelrahim Mohamed', NULL, '97431310330', '28373601770'),
  ('YASSER SOLIMAN', NULL, '97477354490', '27981803976'),
  ('عبد الصمد بن عزوز', NULL, '97433478097', '30150400628'),
  ('mahamoud maan dabboussi', NULL, '97450869246', '29142201020'),
  ('HAMIDA BOUZIANE', NULL, '97470053425', '29001200762'),
  ('سفيان صالح', NULL, '97450770260', '28778802576'),
  ('osmane mohamed', NULL, '97450628032', '30056200014'),
  ('KAMIL ALTAHIR', NULL, '97470294015', '29773602983'),
  ('عمر مراىحي', NULL, '97431299557', '28678802455'),
  ('mokhtar alil', NULL, '97477907750', '29450401278'),
  ('HAMZA YANES', NULL, '97455260218', '28878801028'),
  ('ABDELJALIL HATTACH', NULL, '97450623375', '27350400455'),
  ('مصطفى  ساتي', NULL, '97471826567', '28674007411'),
  ('AYMEN NASRA', NULL, '97450171785', '28178801373'),
  ('mohammed awad', NULL, '97450325578', '28073601721'),
  ('waddah elobaid', NULL, '97471953163', '28673602872'),
  ('radhwan mdini', NULL, '97430004696', '29178801863'),
  ('sead logomo', NULL, '97430228791', '28623003858'),
  ('richard asiedu', NULL, '66906353', '29828800709'),
  ('KHAfgfgfgfgMIS AL-JABOR', '''khafggfgfgmis-1992@hotmail.com''', '97466777763', '23456'),
  ('baligh ben amor', NULL, '97433418142', '29378801459'),
  ('ADAM SALIH G. MOHAMED', NULL, '97450066411', '28873601685'),
  ('يحيى احمد عبدالرحمن', '''test@test.com''', '97430757943', '29442200753'),
  ('Sofiene Ben salah', NULL, '97450770260', '2878802576'),
  ('Mouheb Gandouzi', NULL, '97451201321', '29978800900'),
  ('QFORCE SECURITY SERVICE', NULL, '97450446192', '25963400049'),
  ('aurangzeb din', NULL, '97430654309', '30358604009'),
  ('Abdelrahim Mohamed', NULL, '97431310330', '28373601770'),
  ('mohammad ismail', NULL, '97477572739', '27640000497'),
  ('ameer zaib', NULL, '97455631990', '29058609122'),
  ('حسان بو علاق', '''demo@gmail.com''', '66553638', '30078800270'),
  ('KHAfgfgfgfgMIS AL-JABOR', '''khafggfgfgmis-1992@hotmail.com''', '97466777763', '23456'),
  ('MUHAMMAD S.M.M KHALIFA', NULL, '97430811517', '27581805457'),
  ('mohanad aldaher', NULL, '97430623322', '29076000589'),
  ('lukman dramani', NULL, '97433963041', '28328800923'),
  ('Mazyad Saab', NULL, '97470099200', '28376003475'),
  ('عبد العزيز علي', NULL, '97470342655', '27173600979'),
  ('ABDELAZIZ JERFEL', NULL, '97433767961', '29278800776'),
  ('محمود مازن محمود عباس', NULL, '97466747457', '28940000328'),
  ('omar hmem', NULL, '97459993757', '29578802075'),
  ('يوسف قابل', NULL, '97471155135', '29801200641'),
  ('ثامر محمد', '''demo@gmail.com''', '30067536', '27981811596'),
  ('mohamed noomani', NULL, '97470301442', '29878800782'),
  ('emad bhagil', NULL, '97459920777', '28873601635'),
  ('مختارالامين', NULL, '97450129848', '29073602003'),
  ('Abdelrahim Mohamed', NULL, '97431310330', '28373601770'),
  ('lukman dramani', NULL, '97433963041', '28328800923'),
  ('MOHAMED AHMED', NULL, '97433374204', '29573601588'),
  ('amjid wadan', NULL, '97466265370', '29158604788'),
  ('HANY HUSHAM', NULL, '97477660012', '29473600218'),
  ('مجدي بخيت', NULL, '97450246458', '27473601102'),
  ('سامي عبد الله', NULL, '97430534902', '30073601472'),
  ('tarak hamlet', NULL, '97430058936', '27901200323'),
  ('imed ayari', NULL, '97466071051', '27478800538'),
  ('AMMAR GHOZY', NULL, '97430403800', '27976002717'),
  ('ADIL ABDELKARIM', NULL, '97430108811', '28273601623'),
  ('zafar ullah badshah', NULL, '97466463832', '30058603754'),
  ('Ghazi Emmad ben meddeb', NULL, '97433600885', '29078801834'),
  ('محمد عبد الله سلمان', '''fleetalarraf@gmail.com''', '97455554627', '28773600707'),
  ('RIZWAN BAHADAR', NULL, '97470732908', '30258603755'),
  ('MUHAMMAD GUL', NULL, '97451145953', '29358608980'),
  ('ahmed elwasila', NULL, '97450118063', '27773601703'),
  ('ahmed ali mawlod abdalla', NULL, '97471189859', '28173601977'),
  ('احمد عبدالله محمد', '''test@test.net''', '97470692014', '287273602091'),
  ('Zyed Yahmadi', NULL, '97430330103', '28778802136'),
  ('KHAMIS AL-JABOReeee', '''khamis-19eeee92@hotmail.com''', '97466707063', '12345425256'),
  ('shadrack saky', NULL, '97455076981', '29428801276'),
  ('فادي السعيدي', NULL, '97466043445', '29778800257'),
  ('KOSAY HAMMAMI', NULL, '97477860733', '30378800305'),
  ('محمد محمد احمد', NULL, '97470007983', '29073602906'),
  ('mokhtar alil', NULL, '97477907750', '29450401278'),
  ('amir ben fredj', NULL, '97466172920', '30078800658'),
  ('awol ibrahim', NULL, '97433102862', '29623000824'),
  ('محمد العويني', '''demo@gmail.com''', '668168169', '29350401869'),
  ('prince boateng', NULL, '97471581990', '29428801253'),
  ('samuel yeboah', NULL, '97455470224', '28728801134'),
  ('josef ado', NULL, '66929795', '29628800431'),
  ('Mohammad ibrar Abdul hanan', NULL, '97470505396', '28658609296'),
  ('KHAMIS AL-JABOReeee', '''khamis-19eeee92@hotmail.com''', '97466707063', '12345425256'),
  ('emmanuel darko', NULL, '97471581990', '29028801637'),
  ('hany mohamed', NULL, '97474498604', '28673601907'),
  ('Hamza BADOU', NULL, '97431179706', '29850400215'),
  ('EIHAB ABDALLA', NULL, '97474488904', '26373600792'),
  ('sead logomo', NULL, '97430228791', '28623003858'),
  ('mohamed yousif', NULL, '97430383077', '28973603370'),
  ('ahmed arsheen', NULL, '97451066888', '28873601888'),
  ('VARUN KUMAR C CHAUHAN', NULL, '97439912483', '28635683688'),
  ('عبد الله برهام', NULL, '97430945601', '28573602905'),
  ('قسورة عبد الرحيم', NULL, '97471109995', '29973602573'),
  ('yahia sakhri', NULL, '97450447989', '29778801907'),
  ('علاء الدين بوزيان', '''aa@aa.com''', '97470460269', '30050401172'),
  ('Haq Nawaz Rahim Bakhsh', NULL, '97433048081', '29158610784'),
  ('clement gyamerah', NULL, '97433418726', '28328800923'),
  ('hamdi thabet', NULL, '97477763707', '27881810216'),
  ('olusegun onadairo', NULL, '97455521186', '27056600175'),
  ('AMARA KHARROUBI', NULL, '97430122896', '29178800153'),
  ('مؤسى حيمر', '''demo@gmail.com''', '71503673', '29701201023'),
  ('mohamed abdalla', NULL, '97470083881', '30173601086'),
  ('WALID CHOURABI', NULL, '97431308631', '28878801207'),
  ('Abdulhanna abulhashem', NULL, '97455222976', '26405000204'),
  ('ALI ABBAS', NULL, '97450405018', '27973600010'),
  ('saddam el falah', NULL, '97455031297', '29078801030'),
  ('HABIB KHELIFI', NULL, '97466205223', '29178801261'),
  ('tarek boutemedjet', NULL, '97455039533', '27801200137'),
  ('mubarek golcha', NULL, '97470539031', '29323001021'),
  ('KHAfgfgfgfgMIS AL-JABOR', '''khafggfgfgmis-1992@hotmail.com''', '97466777763', '23456'),
  ('kaies ayari', NULL, '97430109102', '28378801754'),
  ('ماهر مهيري', NULL, '97470220390', '28978802695'),
  ('foster ngo', NULL, '97430637515', '28728801134'),
  ('hamze hussein', NULL, '97471348615', '30042200722'),
  ('زين العابدين ادريس', '''fleetalarraf@gmail.com''', '97470897519', '29773601765'),
  ('wassim chatmen', NULL, '97433226604', '29678801204'),
  ('mohamed ahmed', NULL, '97455304449', '26373601256'),
  ('MEDHAT BAKRY', NULL, '97433766022', '29073603453'),
  ('KHALIL CHMENGUI', NULL, '97460099391', '2977881408'),
  ('almunzer ali', NULL, '97430529501', '2907364140'),
  ('prince boateng', NULL, '97471581990', '29428801253'),
  ('ABUELMAALI ISMAIL', NULL, '97466981255', '27173601092'),
  ('Awad el karim Abdelmonim', NULL, '97466947604', '28073601741'),
  ('Sofiene Ben salah', NULL, '97450770260', '2878802576'),
  ('fatima akka', NULL, '97471202018', '29350401015'),
  ('riaz khan', NULL, '97430692099', '29158609040'),
  ('Saif ur rehman mohammad Ramzan', NULL, '97431466795', '27358603920'),
  ('mohamed hassen omer mohamed', NULL, '97450131342', '28673603009'),
  ('HICHEM ABDERAHIM', NULL, '97433787589', '28178801371'),
  ('issam hamdani', NULL, '97430666450', '27978800282'),
  ('MOJEEB AMIN', NULL, '97477909052', '27573601888'),
  ('ANOUER MATHLOUTHI', NULL, '97430532292', '29278802521'),
  ('بسام فتحي اللوز', '''fleetalarraf@gmail.com''', '97470882208', '28578801729'),
  ('atef sghairi', NULL, '97477024940', '28878801902'),
  ('تجربة ثانية', '''khadffgfgfgmis-1992@hotmail.com''', '97454745684', '23456'),
  ('أنور جنبيني', NULL, '97451476442', '29450401901'),
  ('abdul basit khan', NULL, '97431492385', '30458601729'),
  ('saeed al-hebabi', NULL, '97433333971', '28663402985'),
  ('ganga chaudhary', NULL, '97477179042', '27552401953'),
  ('SAID HILALI', NULL, '97466653585', '28878802218');

-- ================================================================
-- STAGE 2: Smart matching and update customers
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
  RAISE NOTICE '📞 SMART UPDATE: Customer Phone & Civil ID';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE 'Processing 348 customer records...';
  RAISE NOTICE '';
  
  FOR v_rec IN SELECT * FROM temp_customer_data WHERE phone IS NOT NULL OR civil_id IS NOT NULL
  LOOP
    v_progress := v_progress + 1;
    
    -- Smart matching by customer name
    UPDATE customers c
    SET 
      phone = COALESCE(c.phone, v_rec.phone),
      national_id = COALESCE(c.national_id, v_rec.civil_id),
      license_number = COALESCE(c.license_number, v_rec.civil_id),
      email = COALESCE(c.email, v_rec.email),
      updated_at = NOW()
    WHERE c.company_id = v_company_id
      AND (
        -- Name matching (fuzzy)
        LOWER(TRIM(COALESCE(c.first_name_ar, c.company_name_ar, ''))) 
          = LOWER(TRIM(v_rec.customer_name))
        OR LOWER(TRIM(COALESCE(c.first_name_ar, c.company_name_ar, ''))) 
          LIKE '%' || LOWER(TRIM(v_rec.customer_name)) || '%'
        OR LOWER(TRIM(v_rec.customer_name)) 
          LIKE '%' || LOWER(TRIM(COALESCE(c.first_name_ar, c.company_name_ar, ''))) || '%'
      )
      AND (
        -- Only update if phone or national_id is missing
        c.phone IS NULL 
        OR TRIM(c.phone) = '' 
        OR c.national_id IS NULL 
        OR TRIM(c.national_id) = ''
        OR c.license_number IS NULL
      );
    
    GET DIAGNOSTICS v_updated = ROW_COUNT;
    
    IF v_updated > 0 THEN
      v_matched := v_matched + v_updated;
    END IF;
    
    -- Progress every 50 records
    IF v_progress % 50 = 0 THEN
      RAISE NOTICE '   Progress: % / 348 processed...', v_progress;
    END IF;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE '✅ Total customers updated: %', v_matched;
  RAISE NOTICE '';
  
END $$;

-- ================================================================
-- VERIFICATION
-- ================================================================

-- Sample updated customers
SELECT 
  '✅ Sample Updated Customers (Top 20)' as section,
  COALESCE(first_name_ar, company_name_ar) as customer_name,
  phone,
  national_id,
  license_number,
  email,
  CASE 
    WHEN phone IS NOT NULL AND phone != '' THEN '✅'
    ELSE '❌'
  END as has_phone,
  CASE 
    WHEN national_id IS NOT NULL AND national_id != '' THEN '✅'
    WHEN license_number IS NOT NULL THEN '✅'
    ELSE '❌'
  END as has_id
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND (
    phone IS NOT NULL 
    OR national_id IS NOT NULL 
    OR license_number IS NOT NULL
  )
ORDER BY updated_at DESC
LIMIT 20;

-- Statistics
SELECT 
  '📊 Customer Data Statistics' as report,
  COUNT(*) as total_customers,
  COUNT(*) FILTER (WHERE phone IS NOT NULL AND phone != '') as with_phone,
  COUNT(*) FILTER (WHERE national_id IS NOT NULL AND national_id != '') as with_national_id,
  COUNT(*) FILTER (WHERE license_number IS NOT NULL AND license_number != '') as with_license,
  ROUND(COUNT(*) FILTER (WHERE phone IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) || '%' as phone_coverage,
  ROUND(COUNT(*) FILTER (WHERE national_id IS NOT NULL OR license_number IS NOT NULL)::NUMERIC / COUNT(*) * 100, 1) || '%' as id_coverage
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4';

-- Check specific customer (issam abdallah)
SELECT 
  '🔍 Customer: issam abdallah' as check_type,
  COALESCE(first_name_ar, company_name_ar) as name,
  phone,
  national_id,
  license_number,
  email
FROM customers
WHERE company_id = '24bc0b21-4e2d-4413-9842-31719a3669f4'
  AND (
    LOWER(first_name_ar) LIKE '%issam%'
    OR LOWER(first_name_ar) LIKE '%abdallah%'
  )
LIMIT 5;

-- Clean up
DROP TABLE IF EXISTS temp_customer_data;

-- ================================================================
-- SUMMARY
-- ================================================================
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '✅ CUSTOMER DATA UPDATE COMPLETED!';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 What was done:';
  RAISE NOTICE '1. ✅ Matched customers by name (fuzzy matching)';
  RAISE NOTICE '2. ✅ Updated phone numbers';
  RAISE NOTICE '3. ✅ Updated civil IDs / driver licenses';
  RAISE NOTICE '4. ✅ Updated email addresses';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Check the statistics above!';
  RAISE NOTICE '';
  RAISE NOTICE '💡 Only updated customers with missing data';
  RAISE NOTICE '   (Won''t overwrite existing data)';
  RAISE NOTICE '';
  RAISE NOTICE '====================================================================';
  RAISE NOTICE '';
END $$;
