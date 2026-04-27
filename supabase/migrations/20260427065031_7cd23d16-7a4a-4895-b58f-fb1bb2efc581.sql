UPDATE public.posts
SET content = 
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
  replace(
    content,
    '서비스 이용 약관,', '**서비스 이용 약관,**'),
    '​[Keb-Dee] 서비스 이용 약관', '**​[Keb-Dee] 서비스 이용 약관**'),
    '​시행일: 2026년 4월 27일', '**​시행일: 2026년 4월 27일**'),
    '​제1조 (목적)', '**​제1조 (목적)**'),
    '​제2조 (용어의 정의)', '**​제2조 (용어의 정의)**'),
    '​1. 서비스:', '**​1. 서비스:**'),
    '​2. 회원:', '**​2. 회원:**'),
    '3. ​영수증 데이터:', '**3. ​영수증 데이터:**'),
    '​제3조 (서비스의 제공 및 특징)', '**​제3조 (서비스의 제공 및 특징)**'),
    '1. ​지출 관리:', '**1. ​지출 관리:**'),
    '​2. AI 영수증 분석:', '**​2. AI 영수증 분석:**'),
    '​3. Dutch-Dee (정산):', '**​3. Dutch-Dee (정산):**'),
    '​제4조 (회원의 의무 및 주의사항)', '**​제4조 (회원의 의무 및 주의사항)**'),
    '2. ​데이터 확인 의무:', '**2. ​데이터 확인 의무:**')
WHERE id = 'a15b80b3-272a-4379-820d-c24ecff4659f';

UPDATE public.posts
SET content =
  replace(
  replace(
  replace(
    content,
    '​제5조 (책임의 제한)', '**​제5조 (책임의 제한)**'),
    '1. ​금융 거래 비관여:', '**1. ​금융 거래 비관여:**'),
    '태국 왕국(Kingdom of Thailand) 법률', '**태국 왕국(Kingdom of Thailand) 법률**')
WHERE id = 'a15b80b3-272a-4379-820d-c24ecff4659f';