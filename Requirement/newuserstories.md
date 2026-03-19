# QuadraILearn — Detailed User Stories with Acceptance Criteria

---

# 🧩 MODULE 1: AUTHENTICATION

## EPIC 1: Student Registration

### User Story 1.1
As a student  
I want to register on the platform  
So that I can access mock tests  

#### Acceptance Criteria

**Success Scenarios**
Given the user is on the registration page  
When the user enters valid name, email/mobile, and password  
Then the system should create a new account and show success  

Given the registration is successful  
When the process completes  
Then the system should redirect user to login or dashboard  

**Failure Scenarios**
Given email/mobile already exists  
When the user submits registration  
Then the system should show "User already exists" error  

Given invalid email/mobile format  
When the user submits  
Then the system should show validation error  

Given password is weak (less than required rules)  
When submitted  
Then system should reject with validation message  

**Boundary Conditions**
Given fields are empty  
When form is submitted  
Then system should block submission  

Given extremely long input values  
When submitted  
Then system should validate max length  

---

## EPIC 2: Student Login

### User Story 2.1
As a student  
I want to log in securely  
So that I can access my account  

#### Acceptance Criteria

**Success**
Given valid credentials  
When user logs in  
Then system should authenticate and generate session/token  

**Failure**
Given invalid credentials  
When login attempted  
Then system should show "Invalid credentials"  

Given user not registered  
When login attempted  
Then system should show "User not found"  

**Security**
Given multiple failed attempts  
When threshold exceeded  
Then system should throttle or block login  

**Boundary**
Given empty credentials  
When login attempted  
Then system should block request  

---

# 🧩 MODULE 2: EXAM & SUBJECT SELECTION

## EPIC 3: Exam Selection

### User Story 3.1
As a student  
I want to select an exam  
So that I get relevant tests  

#### Acceptance Criteria

Given user is logged in  
When exam screen loads  
Then system should fetch and display all active exams  

Given no exams configured  
When screen loads  
Then system should show empty state  

---

### User Story 3.2
As a student  
I want to select a subject  
So that I can take a specific test  

#### Acceptance Criteria

Given exam selected  
When subject list loads  
Then subjects mapped to exam should display  

Given no subjects available  
When screen loads  
Then system should show "No subjects available"  

Given subject not selected  
When user clicks start  
Then system should block action  

---

# 🧩 MODULE 3: MOCK TEST ENGINE

## EPIC 4: Test Eligibility

### User Story 4.1
As a student  
I want system to check my eligibility  
So that I know if test is free or paid  

#### Acceptance Criteria

Given first attempt  
When eligibility checked  
Then system should return free = true  

Given subsequent attempt  
When eligibility checked  
Then system should return payment required  

Given system error  
When eligibility checked  
Then system should show retry option  

---

## EPIC 5: Start Mock Test

### User Story 5.1
As a student  
I want to start a 30-question test  
So that I can assess my knowledge  

#### Acceptance Criteria

**Success**
Given exam & subject selected  
When start clicked  
Then system should generate 30 questions  

Given sufficient question pool  
When test generated  
Then questions should be randomized  

**Failure**
Given less than 30 questions available  
When test starts  
Then system should show error or fallback  

Given no eligibility/payment  
When start clicked  
Then system should block  

**Boundary**
Given repeated start clicks  
When triggered  
Then duplicate test creation should be prevented  

---

## EPIC 6: Test Attempt

### User Story 6.1
As a student  
I want to answer questions  
So that I can complete test  

#### Acceptance Criteria

Given test active  
When answer selected  
Then answer should be saved instantly  

Given user navigates questions  
When moving between questions  
Then previous answers should persist  

Given internet interruption  
When occurs  
Then answers should be retained locally or retried  

---

### User Story 6.2
As a student  
I want to submit test  
So that I can see results  

#### Acceptance Criteria

**Success**
Given all answers submitted  
When submit clicked  
Then system should evaluate test  

**Failure**
Given submission fails  
When network error  
Then retry option shown  

**Boundary**
Given unanswered questions  
When submitted  
Then system should count them correctly  

Given multiple submit clicks  
When triggered  
Then duplicate submissions prevented  

---

# 🧩 MODULE 4: REPORTING

## EPIC 7: Test Report

### User Story 7.1
As a student  
I want to see my test report  
So that I understand my performance  

#### Acceptance Criteria

Given test submitted  
When report loads  
Then show:
- total questions  
- correct  
- wrong  
- unanswered  
- score  
- percentage  

Given report fails to load  
When error occurs  
Then retry option shown  

---

## EPIC 8: Weak Content Detection

### User Story 8.1
As a student  
I want to see weakest topics  
So that I can improve  

#### Acceptance Criteria

Given answers evaluated  
When system processes  
Then weak topics should be calculated  

Given multiple weak topics  
When displayed  
Then ranked list shown  

Given no mapping exists  
When calculating  
Then system should skip and log error  

---

# 🧩 MODULE 5: LEARNING FLOW

## EPIC 9: Weak Content Learning

### User Story 9.1
As a student  
I want to read weak topic content  
So that I improve  

#### Acceptance Criteria

Given topic selected  
When opened  
Then content should display  

Given no content exists  
When opened  
Then fallback message shown  

Given content load failure  
When error  
Then retry option  

---

## EPIC 10: Retest Flow

### User Story 10.1
As a student  
I want to take another test  
So that I can improve  

#### Acceptance Criteria

Given report page  
When displayed  
Then show:
- Retest button  
- Learn button  

Given retest clicked  
When eligibility checked  
Then payment/free logic applied  

---

# 🧩 MODULE 6: PAYMENT SYSTEM

## EPIC 11: Payment

### User Story 11.1
As a student  
I want to pay ₹10  
So that I can unlock next test  

#### Acceptance Criteria

**Success**
Given payment initiated  
When payment success  
Then test unlocked  

**Failure**
Given payment failed  
When occurs  
Then retry option shown  

Given payment pending  
When timeout  
Then system should verify status  

**Edge**
Given duplicate payment  
When occurs  
Then system should prevent double charge  

---

## EPIC 12: Entitlement

### User Story 12.1
As a system  
I want to track usage  
So that misuse is prevented  

#### Acceptance Criteria

Given payment success  
When processed  
Then entitlement created  

Given test started  
When consumed  
Then entitlement marked used  

Given no entitlement  
When start test  
Then block access  

---

# 🧩 MODULE 7: ADMIN PANEL

## EPIC 13: Exam Management

### User Story 13.1
As an admin  
I want to manage exams  
So that structure is controlled  

#### Acceptance Criteria
- create exam  
- update exam  
- delete exam  
- toggle active/inactive  

---

## EPIC 14: Question Management

### User Story 14.1
As an admin  
I want to manage questions  
So that tests can be generated  

#### Acceptance Criteria

Given question created  
When saved  
Then must include:
- exam  
- subject  
- topic  
- correct answer  

Given invalid data  
When saved  
Then validation error  

---

## EPIC 15: Pricing Control

### User Story 15.1
As an admin  
I want to set pricing  
So that business model can change  

#### Acceptance Criteria

Given admin updates price  
When saved  
Then system should apply new price  

Given invalid price  
When entered  
Then reject input  

---

## EPIC 16: Monitoring

### User Story 16.1
As an admin  
I want to view student activity  
So that I can track usage  

### User Story 16.2
As an admin  
I want to view payments  
So that I can track revenue  

---

# ⚠️ EDGE CASE STORIES

### EC1
As a student  
I want my test to resume after interruption  
So that I don’t lose progress  

### EC2
As a system  
I want to prevent multiple free tests  
So that misuse is avoided  

### EC3
As a system  
I want to handle payment callback delays  
So that entitlement is correctly assigned  

### EC4
As a system  
I want to prevent duplicate submissions  
So that data integrity is maintained  

---

# 🚀 FINAL FLOW

Register/Login  
→ Select Exam  
→ Select Subject  
→ Start Test (Free/Paid)  
→ Attempt  
→ Submit  
→ View Report  
→ Weak Topics  
→ Learn  
→ Retest  

---

# 📊 TOTAL COVERAGE

- Epics: 16  
- User Stories: 30+  
- Covers:
  - Functional flows
  - Failure scenarios
  - Edge cases
  - Boundary conditions
  - Payment handling
  - Admin operations  
