import React,{useState,useEffect,useMemo} from 'react'
import { useGlobalState } from '../globalState'
import { doc, updateDoc } from "firebase/firestore"
import { DB } from "../firebaseConfig"
import { Modal } from "antd"
import ClipLoader from "react-spinners/ClipLoader"
import { IoIosArrowBack } from "react-icons/io"
import { IoIosArrowForward } from "react-icons/io"
import { FcOk } from "react-icons/fc"

const students = () => {
  const { students,loading } = useGlobalState()

  const [selectedMonth, setSelectedMonth] = useState(null)
  const [nameFilter, setNameFilter] = useState('')
  const [monthlySubsFilter, setMonthlySubsFilter] = useState('')
  const [paidFilter, setPaidFilter] = useState("")
  const [selectedStudent,setSelectedStudent] = useState(null)
  const [markingStudentAsPaid,setMarkingStudentAsPaid] = useState(false)

  const months = [
    { id: 0, month: "يناير" },
    { id: 1, month: "فبراير" },
    { id: 2, month: "مارس" },
    { id: 3, month: "أبريل" },
    { id: 4, month: "مايو" },
    { id: 5, month: "يونيو" },
    { id: 6, month: "يوليو" },
    { id: 7, month: "أغسطس" },
    { id: 8, month: "سبتمبر" },
    { id: 9, month: "أكتوبر" },
    { id: 10, month: "نوفمبر" },
    { id: 11, month: "ديسمبر" },
  ];

  // Set the current month on first render
  useEffect(() => {
    const currentMonthId = new Date().getMonth();
    setSelectedMonth(months[currentMonthId]);
  }, []);

  // Navigate to the previous month
  const goToPreviousMonth = () => {
    const newMonthId = selectedMonth.id - 1;
    if (newMonthId >= 0) setSelectedMonth(months[newMonthId]);
  };

  // Navigate to the next month
  const goToNextMonth = () => {
    const currentMonthId = new Date().getMonth();
    const newMonthId = selectedMonth.id + 1;
    if (newMonthId <= currentMonthId) setSelectedMonth(months[newMonthId]);
  };

  // Check if the "Previous Month" button should be disabled
  const isPreviousMonthDisabled = selectedMonth?.id === 0;

  // Check if the "Next Month" button should be disabled
  const isNextMonthDisabled = () => {
    const currentMonthId = new Date().getMonth();
    return selectedMonth?.id >= currentMonthId;
  };

  // Filtered students based on search term
  const filteredStudents = useMemo(() => {
      return students.filter((student) =>{

      //filter by name
      const matchesName = nameFilter === '' || student.student_full_name.includes(nameFilter)

      //filter by monthly subs fee
      const matcheMonthlySubs = monthlySubsFilter === '' || student.monthly_sub?.toString().includes(monthlySubsFilter);

      // Filter by paid status for the selected month
      const matchesPaidStatus = paidFilter === '' || (() => {
        // Find the bill for the selected month
        const monthBill = student?.bill?.find(b => b.id === selectedMonth.id);
        // If no bill found for the month, exclude the student
        if (!monthBill) return false;

        // Check if the paid status matches the filter
        return paidFilter === "yes" ? monthBill.paid === true : monthBill.paid === false;
      })();

      // Return only students matching all filters
      return matchesName && matcheMonthlySubs && matchesPaidStatus;
    });
  },[students, nameFilter, monthlySubsFilter, paidFilter, selectedMonth]);

  // Open student info Modal
  const openStudentInfoModalHandler = async(student) => {
    setSelectedStudent(student)
  }

  // Close student info Modal
  const closeStudentInfoModal = () => {
    setSelectedStudent(null)
  }

  // Function to mark payment as paid
  const markAsPaid = async () => {
    if (selectedStudent && selectedMonth) {
      setMarkingStudentAsPaid(true)
      try {
        const studentDocRef = doc(DB, "students", selectedStudent.id);
        const updatedBills = selectedStudent.bill.map((bill) =>
          bill.id === selectedMonth.id ? { ...bill, paid: true } : bill
        );

        await updateDoc(studentDocRef, { bill: updatedBills });

        // Update local state
        setSelectedStudent((prev) => ({
          ...prev,
          bill: updatedBills,
        }));

        // Show success modal
        Modal.success({
          content: "تم تحديث حالة الدفع بنجاح",
          centered: true,
          style: {
            textAlign: 'center',
          },
        });

        closeStudentInfoModal();
      } catch (error) {
        Modal.error({
          content: "حدث خطأ أثناء تحديث حالة الدفع. حاول مرة أخرى.",
        });
        console.error("Error updating payment status:", error);
      } finally {
        setMarkingStudentAsPaid(false)
      }
    }
  };

  // Render titles dynamically
  const renderTitles = () => (
    <div className='students-section-inner-titles'>

      <div className='students-section-inner-title'>
        <input 
          onChange={(e) => setNameFilter(e.target.value)}
          value={nameFilter}
          placeholder='الاسم' 
          type='text' 
          className='students-section-inner-title_search_input' 
        />
      </div>

      <div className='students-section-inner-title'>
        <input 
          onChange={(e) => setMonthlySubsFilter(e.target.value)}
          value={monthlySubsFilter}
          placeholder='الاشتراك الشهري' 
          type='text' 
          className='students-section-inner-title_search_input' 
        />
      </div>

      <div className="students-section-inner-title">
        <select 
          onChange={(e) => setPaidFilter(e.target.value)} 
          value={paidFilter} 
          className="students-section-inner-title_search_input"
        >
          <option value="">الحالة</option>
          <option value="yes">دفع</option>
          <option value="no">لم يدفع</option>
        </select>
      </div>

    </div>
  )

  // Render students list
  const renderStudents = () => (
    <>
      {filteredStudents.map((student, index) => {
        // Find the bill for the selected month
        const billForSelectedMonth =
          selectedMonth !== null
            ? student.bill?.find((bill) => bill.id === selectedMonth.id)
            : null;

        return (
          <div key={index} className="single-item">
            <h5
              onMouseEnter={(e) => (e.target.style.textDecoration = "underline")}
              onMouseLeave={(e) => (e.target.style.textDecoration = "none")}
              onClick={() => openStudentInfoModalHandler(student)}
            >
              {student?.student_full_name}
            </h5>
            <Modal
              title= 'معلومات الطالب'
              open={selectedStudent}
              onCancel={closeStudentInfoModal}
              centered
              footer={null}
            >

              <div className='student-inside-modal-info-conainer'>
                <div>
                  <p>{selectedStudent?.student_full_name}</p>
                  <p>{selectedStudent?.student_school}</p>
                  <div style={{display:'flex',flexDirection:'row-reverse'}}>
                    <p>{selectedStudent?.student_state}</p>
                    <p style={{marginInline:'5px'}}>-</p>
                    <p>{selectedStudent?.student_city}</p>
                    <p style={{marginInline:'5px'}}>-</p>
                    <p>{selectedStudent?.student_home_address}</p>
                  </div>
                  <p>{selectedStudent?.student_phone_number}</p>
                  <div className='student-inside-modal-info-subscription'>
                    <div style={{display:'flex',flexDirection:'row-reverse',alignItems:'center',marginBottom:'10px'}}>
                      <p>الاشتراك الشهري: {selectedStudent?.monthly_sub?.toLocaleString()}</p>
                      <p style={{marginRight:'5px'}}>د.ع</p>
                    </div>
                    
                    {selectedStudent && selectedMonth && (() => {
                      const selectedStudentBill = selectedStudent?.bill?.find((bill) => bill.id === selectedMonth.id);
                      if (!selectedStudentBill?.paid) {
                        return (
                          <>
                            {markingStudentAsPaid ? (
                              <div style={{ width:'70px',height:'30px',backgroundColor:'#955BFE',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <ClipLoader
                                  color={'#fff'}
                                  loading={markingStudentAsPaid}
                                  size={13}
                                  aria-label="Loading Spinner"
                                  data-testid="loader"
                                />
                              </div>
                            ) : (
                              <button 
                                onClick={markAsPaid}
                                className='student-inside-modal-info-btn'
                                disabled={selectedStudent?.monthly_sub === 0}
                              >
                                دفع
                              </button>
                            )}
                          </>
                        );
                      } else {
                        return (
                          <FcOk size={24} />
                        )
                      }
                    })()}
                  </div>                            
                </div>
              </div>

            </Modal>
            <h5>{student.monthly_sub.toLocaleString()}</h5>
            <h5 className={billForSelectedMonth?.paid ? 'paid-status' : 'unpaid-status'}>
              {billForSelectedMonth?.paid ? 'دفع' : 'لم يدفع'}
            </h5>
          </div>
        );
      })}
    </>
  );

  // Loading data from DB ...
  if(loading) {
    return(
      <div className='white_card-section-container'>
        <div style={{height:'100%',width:'100%',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <ClipLoader
            color={'#955BFE'}
            loading={loading}
            size={50}
            aria-label="Loading Spinner"
            data-testid="loader"
          />
        </div>
      </div>
    )
  }

  return (
    <div className='white_card-section-container'>

        <div className='students-section-inner-titles'>
          <div className='students-section-inner-title'>
            <div className='months-btn-container'>
              <button 
                onClick={goToPreviousMonth}
                disabled={isPreviousMonthDisabled}
                className="month-nav-btn"
                style={{ opacity: isPreviousMonthDisabled ? 0.5 : 1 }}
              >
                <IoIosArrowBack size={22}/>             
              </button>
              <div className="current-month">
                <p>{selectedMonth?.month}</p>
              </div>       
              <button 
                onClick={goToNextMonth}
                disabled={isNextMonthDisabled()}
                className="month-nav-btn"
                style={{ opacity: isNextMonthDisabled() ? 0.5 : 1 }}
              >
                <IoIosArrowForward size={22}/>
              </button>
            </div>
          </div>
        </div>

        {renderTitles()}

        {renderStudents()}

    </div>
  )
}

export default students