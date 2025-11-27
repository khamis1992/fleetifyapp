# Feature 6.2 - Case Workflow Management - User Guide

## 📋 Quick Start

### Navigate to Case Details
```
1. Go to Legal & Compliance → Legal Cases
2. Click on any case in the list
3. Switch to "تفاصيل القضية" (Case Details) tab
4. View status and timeline
```

---

## 🎯 Case Statuses & Workflow

### Status Hierarchy

```
           ┌─────────────┐
           │   DRAFT     │
           │ Being prep. │
           └──────┬──────┘
                  │
                  ▼
           ┌──────────────┐
           │ PENDING      │
           │ REVIEW       │
           └──────┬───────┘
                  │
        ┌─────────┘
        │
        ▼
  ┌──────────┐
  │ APPROVED │
  └────┬─────┘
       │
       ▼
  ┌─────────────┐
  │ NOTICE SENT │
  └────┬────────┘
       │
   ┌───┴────┐
   │        │
   ▼        ▼
┌──────────┐ ┌────────┐
│IN NEGOT. │ │ FILED  │
└────┬─────┘ └───┬────┘
     │           │
     │      ┌────▼─────┐
     │      │ HEARING   │
     │      │ SCHEDULED │
     │      └────┬──────┘
     │           │
     │      ┌────▼────┐
     │      │JUDGMENT  │
     │      │RECEIVED  │
     │      └────┬─────┘
     │           │
     │      ┌────▼──────┐
     │      │ EXECUTION │
     │      └────┬───────┘
     │           │
     └──────┬────┘
            │
            ▼
      ┌──────────┐
      │ SETTLED  │
      └────┬─────┘
           │
      ┌────┴────────┬──────────────┐
      │             │              │
      ▼             ▼              ▼
  ┌────────┐  ┌──────────┐  ┌──────────────┐
  │ CLOSED │  │ CLOSED   │  │   CLOSED     │
  │  WON   │  │  LOST    │  │ WITHDRAWN    │
  └────────┘  └──────────┘  └──────────────┘
```

---

## 📊 Detailed Status Descriptions

### 1️⃣ Draft
**Purpose**: Initial case creation and preparation
- **Who**: Legal team member creates case
- **What Happens**: Case details entered, documents prepared
- **Next Steps**: Submit for review
- **Duration**: 1-3 days

### 2️⃣ Pending Review
**Purpose**: Legal team evaluates case viability
- **Who**: Senior lawyer or legal manager
- **What Happens**: Case reviewed for legal merit, strategy assessed
- **Next Steps**: Approve to proceed or request modifications
- **Duration**: 2-5 days

### 3️⃣ Approved
**Purpose**: Case cleared for legal action
- **Who**: Legal manager approval
- **What Happens**: Case strategy finalized, notice prepared
- **Next Steps**: Send formal notice to customer
- **Duration**: 1 day

### 4️⃣ Notice Sent
**Purpose**: Formal legal notice delivered
- **Who**: Legal team
- **What Happens**: Official notice sent to customer via certified mail/email
- **Next Steps**: Wait for response or proceed with filing
- **Duration**: 5-30 days

### 5️⃣ In Negotiation
**Purpose**: Settlement discussions
- **Who**: Lawyer and customer (or their representative)
- **What Happens**: Settlement offers exchanged, terms negotiated
- **Next Steps**: Reach settlement or escalate to court
- **Duration**: Variable (days to months)

### 6️⃣ Filed
**Purpose**: Case filed with court
- **Who**: Lawyer or court clerk
- **What Happens**: Case formally filed, court summons issued
- **Next Steps**: Schedule hearing
- **Duration**: 1-2 days

### 7️⃣ Hearing Scheduled
**Purpose**: Court hearing confirmed
- **Who**: Court
- **What Happens**: Court date assigned, hearing preparation begins
- **Next Steps**: Attend hearing
- **Duration**: 15-45 days (time before hearing)

### 8️⃣ Judgment Received
**Purpose**: Court issues decision
- **Who**: Judge
- **What Happens**: Court renders judgment for or against
- **Next Steps**: Execute judgment or negotiate settlement
- **Duration**: Immediate

### 9️⃣ Execution
**Purpose**: Enforcing court judgment
- **Who**: Court enforcement, bailiff
- **What Happens**: Attempting to collect funds or enforce other orders
- **Next Steps**: Complete collection or initiate settlement
- **Duration**: 15-90 days

### 🔟 Settled
**Purpose**: Case resolved through settlement
- **Who**: Both parties
- **What Happens**: Settlement agreement reached and executed
- **Next Steps**: Close case as successful
- **Duration**: 1 day

### ✅ Closed - Won
**Purpose**: Case successfully concluded in our favor
- **Status**: Final
- **Result**: Judgment collected or settlement received
- **Actions**: Archive case, update customer status

### ❌ Closed - Lost
**Purpose**: Case concluded unfavorably
- **Status**: Final
- **Result**: Judgment against us or case dismissed
- **Actions**: Archive case, document outcome

### 🚫 Closed - Withdrawn
**Purpose**: Case dismissed or withdrawn
- **Status**: Final
- **Reason**: Settlement, changed circumstances, or strategic decision
- **Actions**: Archive case, update records

---

## 📅 Case Timeline

### What is the Timeline?

The timeline is a **complete history** of all case events in chronological order. Every action, status change, and milestone is recorded.

### Timeline Entry Types

#### 🔵 Automatic Entries (System-generated)
- **Case Created** - When case first added to system
- **Status Changed** - When case status is updated
- **Payment Received** - When payment logged against case

#### 🟠 Manual Entries (User-added)

**Court Hearing**
- Use When: Court hearing occurs
- Record: Date, outcome, next hearing date
- Example: "First court session held. Judge ruled in our favor."

**Lawyer Call**
- Use When: Speaking with legal team
- Record: Discussion topics, agreements, next steps
- Example: "Called with client about settlement offer. Client agreed to proceed."

**Customer Meeting**
- Use When: Meeting with customer
- Record: Topics discussed, customer response, decisions made
- Example: "Met with customer. They agreed to payment plan. Documented in contract."

---

## 🖥️ How to Use

### Change Case Status

```
Step 1: Select Case
└─ Click on case in the cases list

Step 2: Go to Case Details
└─ Click "تفاصيل القضية" tab

Step 3: View Available Actions
└─ Left panel shows current status
└─ Buttons show allowed next statuses

Step 4: Click Status Button
└─ Click the status you want to change to
└─ Only allowed statuses are shown

Step 5: Add Notes (Optional)
└─ A dialog appears
└─ Add notes about why you're changing status
└─ Example: "Reviewed documents, case approved"

Step 6: Confirm
└─ Click "Change Status"
└─ Status updates immediately
└─ Entry automatically added to timeline
```

**Example**:
```
Current Status: "Pending Review"
Available Actions:
- Draft
- Approved ← Click this
- Pending Review (disabled - current)

Dialog appears:
  Changing to: Approved
  Notes: [Legal review completed, documents verified]
  
Click "Change Status"
Result: Status changed to "Approved"
        Timeline updated with new entry
```

---

### Add Timeline Entry

```
Step 1: Go to Case Details
└─ Select case and go to "تفاصيل القضية" tab

Step 2: Find Timeline Section
└─ Right panel shows timeline
└─ Scroll to find "Add Entry" button at top

Step 3: Click "Add Entry"
└─ Dialog opens for new timeline entry

Step 4: Select Entry Type
└─ Court Hearing
└─ Lawyer Call
└─ Customer Meeting

Step 5: Fill in Details
Entry Type: Court Hearing
Title: First Court Session
Description: Judge presided over initial hearing. 
             Case adjourned to December 15.
Date: 2025-11-20
Time: 10:00 AM
Notes: Judge requested additional documentation
       by Dec 1st.

Step 6: Review Preview
└─ Preview shows how entry will look

Step 7: Click "Add Entry"
└─ Entry added to timeline
└─ Appears at top of list
└─ Timestamp automatically assigned
```

---

### Search & Filter Timeline

```
Search:
- Type keywords in search box
- Results filter in real-time
- Searches title, description, notes, performer name

Example Searches:
- "hearing" → Shows only hearing-related entries
- "settlement" → Shows negotiation/settlement entries
- "payment" → Shows payment-related entries
- "john" → Shows entries by or about John

Filter by Category:
- All Categories (default)
- Case Created
- Status Changed
- Payment Received
- Court Hearing
- Lawyer Call
- Customer Meeting

Sort:
- Newest First (default) → Latest events at top
- Oldest First → Earliest events at top
```

---

## 📋 Timeline Entry Examples

### Example 1: Case Creation

```
┌─────────────────────────────────────────┐
│ 📄 CASE CREATED                         │
├─────────────────────────────────────────┤
│ Title: Case Created                     │
│ Status: Automatic                       │
│                                         │
│ Description: Legal case was created     │
│ and added to the system                 │
│                                         │
│ Date: Oct 20, 2025 at 2:30 PM          │
│ By: System                              │
└─────────────────────────────────────────┘
```

### Example 2: Status Change

```
┌─────────────────────────────────────────┐
│ 🔄 STATUS CHANGED                       │
├─────────────────────────────────────────┤
│ Title: Status Changed to Approved       │
│ Status: Automatic                       │
│                                         │
│ Description: Case status was updated    │
│                                         │
│ Notes: "Legal review completed,         │
│        all documents verified.          │
│        Case ready for proceeding."      │
│                                         │
│ Date: Oct 21, 2025 at 10:15 AM         │
│ By: Sarah Johnson (Legal Manager)       │
└─────────────────────────────────────────┘
```

### Example 3: Court Hearing

```
┌─────────────────────────────────────────┐
│ 📅 COURT HEARING                        │
├─────────────────────────────────────────┤
│ Title: First Court Session              │
│ Status: Manual                          │
│                                         │
│ Description: Case heard before          │
│ Judge Ahmad at Circuit Court. Court     │
│ adjourned to December 15, 2025.         │
│                                         │
│ Notes: "Judge requested additional      │
│        documentation by Dec 1st.        │
│        Plaintiff's attorney will        │
│        prepare supplementary brief."    │
│                                         │
│ Date: Nov 20, 2025 at 10:00 AM         │
│ By: Ahmed Hassan (Attorney)             │
└─────────────────────────────────────────┘
```

### Example 4: Lawyer Call

```
┌─────────────────────────────────────────┐
│ 📞 LAWYER CALL                          │
├─────────────────────────────────────────┤
│ Title: Settlement Discussion with Client│
│ Status: Manual                          │
│                                         │
│ Description: Called client to discuss   │
│ settlement offer from defendant. Client │
│ agreed to accept offer of 40,000 KD.    │
│                                         │
│ Notes: "Client approved settlement.     │
│        Next: Draft settlement agreement │
│        and obtain court approval."      │
│                                         │
│ Date: Dec 1, 2025 at 3:45 PM           │
│ By: Fatima Al-Rashid (Attorney)         │
└─────────────────────────────────────────┘
```

---

## 💡 Tips & Best Practices

### Status Management
1. **Always add notes** when changing status
2. **Review allowed transitions** before proceeding
3. **Escalate high-priority cases** promptly
4. **Document all decisions** for audit trail

### Timeline Usage
1. **Add entries promptly** after events
2. **Include relevant details** in description
3. **Use notes for important information**
4. **Search timeline** to find past events
5. **Use filters** to focus on specific event types

### Case Workflow
1. **Follow proper status progression**
2. **Dont skip stages** except in special cases
3. **Communicate status changes** to team
4. **Update timeline** for all significant events
5. **Close cases properly** with final notes

---

## ⚙️ Status Change Rules

### What Status Changes Are Allowed?

**From DRAFT, you can go to**:
- Pending Review (for legal team evaluation)
- Stay Draft (continue preparing)

**From PENDING REVIEW, you can go to**:
- Draft (revise and resubmit)
- Approved (if case looks good)
- Stay Pending Review (still reviewing)

**From APPROVED, you can go to**:
- Notice Sent (proceed with legal action)
- Pending Review (reconsider if needed)
- Stay Approved

**From NOTICE SENT, you can go to**:
- In Negotiation (customer responded)
- Filed (no response, proceed to court)
- Stay Notice Sent (waiting for response)

**From IN NEGOTIATION, you can go to**:
- Settled (agreement reached)
- Filed (negotiations failed, go to court)
- Stay In Negotiation

**From FILED, you can go to**:
- Hearing Scheduled (court date set)
- Stay Filed

**From HEARING SCHEDULED, you can go to**:
- Judgment Received (hearing held)
- Stay Hearing Scheduled (waiting)

**From JUDGMENT RECEIVED, you can go to**:
- Execution (enforce judgment)
- Settled (reach settlement)
- Stay Judgment Received

**From EXECUTION, you can go to**:
- Settled (settlement reached)
- Closed - Won (judgment collected)
- Stay Execution

**From SETTLED, you can go to**:
- Closed - Won (case successfully closed)
- Stay Settled

**CLOSED STATUSES** (Final - no changes):
- Closed - Won
- Closed - Lost
- Closed - Withdrawn

---

## 📊 Timeline Statistics

When viewing timeline, you see summary stats:

```
Total Events: 12
├─ Automatic Events: 7 (status changes, creation)
├─ Manual Events: 5 (court hearing, calls, meetings)
└─ Contributors: 3 people made entries
```

---

## 🔍 Common Questions

**Q: Can I undo a status change?**
A: No, but you can change to a different status if allowed.

**Q: Who can change case status?**
A: Only authorized legal team members (depends on permissions).

**Q: Are timeline entries permanent?**
A: Yes, all entries are permanent for audit trail purposes.

**Q: Can I edit a timeline entry?**
A: No, entries are immutable. Add a new entry if correction needed.

**Q: What if I selected wrong status?**
A: Change to correct status. The wrong status is still shown in timeline.

**Q: How do I close a case?**
A: Change status to one of the CLOSED statuses (Won/Lost/Withdrawn).

---

## 📞 Support

For questions or issues:
1. Check this guide for answers
2. Contact your legal team supervisor
3. Review similar cases for workflows
4. Check timeline for historical context

---

**Status**: ✅ Ready for Production
**Last Updated**: October 26, 2025
