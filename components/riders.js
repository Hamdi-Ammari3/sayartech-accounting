import React,{useState} from 'react'
import Image from 'next/image'
import { useGlobalState } from '../globalState'
import { doc,getDoc,writeBatch} from "firebase/firestore"
import { DB } from "../firebaseConfig"
import { format, subMonths, addMonths } from 'date-fns'
import { ar } from 'date-fns/locale'
import { Modal } from "antd"
import ClipLoader from "react-spinners/ClipLoader"
import * as XLSX from "xlsx"
import { IoIosArrowBack } from "react-icons/io"
import { IoIosArrowForward } from "react-icons/io"
import { FcMediumPriority } from "react-icons/fc"
import { BsArrowLeftShort } from "react-icons/bs"
import { FcOk } from "react-icons/fc"
import money from '../images/dollar.png'
import miniVan from '../images/minivan.png'
import excel from '../images/excel.png'

const riders = () => {
  const { riders } = useGlobalState()

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baghdad" }))
  const year = today.getFullYear()

  const [selectedRider,setSelectedRider] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)
  const [nameFilter, setNameFilter] = useState("")
  const [monthlyAmountFilter, setMonthlyAmountFilter] = useState("")
  const [paidFilter, setPaidFilter] = useState("")
  const [monthlySubsModal,setMonthlySubsModal] = useState(false)
  const [totalSubAmount,setTotalSubAmount] = useState("0")
  const [companyCommission,setCompanyCommission] = useState("0")
  const [driverCommission,setDriverCommission] = useState("0")
  const [editMonthlyFeeLoading,setEditMonthlyFeeLoading] = useState(false)
  const [riderDeatilSelectedMonth,setRiderDeatilSelectedMonth] = useState(new Date().getMonth() + 1)
  const [showCompBillModal, setShowCompBillModal] = useState(false)
  const [paymentMode,setPaymentMode] = useState('')
  const [isEditingPaymentStatus,setIsEditingPaymentStatus] = useState(false)
  
  const currentMonthKey = `${year}-${String(selectedMonth).padStart(2, "0")}`
  const selectedRiderMonthKey = `${year}-${String(riderDeatilSelectedMonth).padStart(2, "0")}`

  // Function to move to the previous month
  const handlePrevMonth = () => {
    const prevDate = subMonths(new Date(selectedYear, selectedMonth - 1), 1);
    setSelectedYear(prevDate.getFullYear());
    setSelectedMonth(prevDate.getMonth() + 1);
  }

  // Function to move to the next month
  const handleNextMonth = () => {
    const nextDate = addMonths(new Date(selectedYear, selectedMonth - 1), 1);
    setSelectedYear(nextDate.getFullYear());
    setSelectedMonth(nextDate.getMonth() + 1);
  }

  // Filter Riders based on inputs
  const filteredRiders = riders.filter((rider) => {
    const bill = rider.bill?.[currentMonthKey] || {};
    const matchesName = nameFilter ? rider.full_name.includes(nameFilter) : true;
    const matchesMonthly = monthlyAmountFilter ? bill.driver_commission_amount?.toString().includes(monthlyAmountFilter) : true;
    const matchesPaid = paidFilter === "yes" ? bill.paid === true : paidFilter === "no" ? bill.paid === false : true;

    return matchesName && matchesMonthly && matchesPaid;
  })

  // Select the student
  const selectRider = async (rider) => {
    setSelectedRider(rider);
  }
  
  // Handle back action
  const goBack = () => {
    setSelectedRider(null)
  }

  //Calculate student age
  const calculateAge = (birthdate) => {
    const birthDate = new Date(birthdate.seconds * 1000); // Convert Firestore Timestamp to JS Date
    const today = new Date();
      
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    
    // Adjust age if the current date is before the birthdate this year
    if (monthDifference < 0 || (monthDifference === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  }

  // Open monthly-subs modal
  const openMonthlySubsModal = (rider) => {
    setMonthlySubsModal(true)
    setTotalSubAmount(rider.monthly_sub > 0 ? rider.monthly_sub : '0')
    setCompanyCommission(rider.company_commission > 0 ? rider.company_commission : '0')
    setDriverCommission(rider.driver_commission > 0 ? rider.driver_commission : '0')
  }

  // Close monthly-subs modal
  const handleCloseMonthlySubsModal = () => {
    setMonthlySubsModal(false)
    setTotalSubAmount("0")
    setCompanyCommission("0")
    setDriverCommission("0")
  }

  // Format money input format
  const formatNumber = (value) => {
    if (!value) return '';
    return Number(value.toString().replace(/,/g, '')).toLocaleString('en-US');
  }

  // Handle total subscription change
  const handleTotalSubAmountChange = (value) => {
    const total = Number(value.replace(/,/g, '')) || 0;
    setTotalSubAmount(total)
    setDriverCommission(total - companyCommission)
  }

  // Handle company commission change
  const handleCompanyCommissionChange = (value) => {
    const commission = Number(value.replace(/,/g, '')) || 0;
    setCompanyCommission(commission)
    setDriverCommission(totalSubAmount - commission)
  }

  const ensureAllMonthsExist = (bill, monthlySub,companyCom) => {
    const updatedBill = { ...bill }; // Clone the existing bill object
    const currentYear = new Date().getFullYear();
  
    for (let month = 1; month <= 12; month++) {
      const key = `${currentYear}-${String(month).padStart(2, "0")}`;
  
      if (!updatedBill[key]) {
        updatedBill[key] = {
          driver_commission_amount: monthlySub,
          company_commission_amount: companyCom,
          start_date: null,
          end_date: null,
          active:false,
          paid: false,
          payment_mode:null
        };
      }
    }
  
    return updatedBill;
  }

  // Function to get days in the current month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  }

  // Open the complementary bill modal
  const handleCloseComBillModal = () => {
    setShowCompBillModal(false)
  }

  // Edit student monthly fee
  const editStudentMonthlyFee = async () => {
    if (totalSubAmount <= 0 || companyCommission < 0 || driverCommission < 0) {
      alert("الرجاء ادخال مبلغ مالي صحيح");
      return;
    }

    setEditMonthlyFeeLoading(true);

    try {
      const riderRef = doc(DB, "riders", selectedRider.id)
      const riderDoc = await getDoc(riderRef);
      if (!riderDoc.exists()) {
        alert("الحساب غير موجود");
        return;
      }

      const batch = writeBatch(DB)

      const riderData = riderDoc.data()
      const updatedBill = ensureAllMonthsExist(riderData.bill || {}, driverCommission,companyCommission)

      // Get current Iraqi date
      const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
      const year = today.getFullYear();
      const month = today.getMonth();
      const currentMonthKey = `${year}-${String(month + 1).padStart(2, "0")}`;

      // Loop through all months in the bill data and update accordingly
      Object.keys(updatedBill).forEach((monthKey) => {
        const bill = updatedBill[monthKey];

        if (bill.paid) {
          return; // Skip the current iteration if the bill is paid
        }

        if (bill.start_date) {
          const startDate = new Date(bill.start_date);
          const startDay = startDate.getDate();
          const totalDays = getDaysInMonth(startDate.getFullYear(), startDate.getMonth());
          const remainingDays = totalDays - startDay + 1;

          // Calculate new prorated amount for months with start_date
          const newDailyRate = driverCommission / 30;
          const newProratedAmount = Math.round(newDailyRate * remainingDays);
          updatedBill[monthKey].driver_commission_amount = newProratedAmount;
          updatedBill[monthKey].company_commission_amount = companyCommission;

        } else if (monthKey < currentMonthKey) {
          // For months before the current month, update to the full new amount
          updatedBill[monthKey].driver_commission_amount = driverCommission;
          updatedBill[monthKey].company_commission_amount = companyCommission;
        } else {
          // For the current month and future months, apply new rates
          updatedBill[monthKey].driver_commission_amount = driverCommission;
          updatedBill[monthKey].company_commission_amount = companyCommission;
        }
      });

      // Update the student document with all fee values
      batch.update(riderRef, { 
        monthly_sub: Number(totalSubAmount.toString().replace(/,/g, "")),
        company_commission: Number(companyCommission.toString().replace(/,/g, "")),
        driver_commission: Number(driverCommission.toString().replace(/,/g, "")),
        bill: updatedBill,
      });

      // Commit the batch
      await batch.commit();

      alert("تم اضافة المبلغ المالي بنجاح");

      // Update the local state
      setSelectedRider((prev) => ({
        ...prev,
        monthly_sub: totalSubAmount,
        company_commission: companyCommission,
        driver_commission: driverCommission
      }))

      setTotalSubAmount(0)
      setCompanyCommission(0)
      setDriverCommission(0)
      setMonthlySubsModal(false)
    } catch (error) {
      console.log("Error updating the monthly subscription fee:", error);
      alert("حدث خطا. الرجاء المحاولة مرة ثانية");
    } finally {
      setEditMonthlyFeeLoading(false)
    }
  }

  // Edit bill paied status
  const editBillPayedStatusHandler = async () => {
    if (!selectedRider || !selectedRiderMonthKey) return;

    if(!paymentMode) {
      alert('الرجاء تحديد طريقة الدفع')
      return
    }

    setIsEditingPaymentStatus(true); // Start loading
  
    try {
      const riderRef = doc(DB, "riders", selectedRider.id);
      const riderDoc = await getDoc(riderRef);

      if (!riderDoc.exists()) {
        alert("الحساب غير موجود");
        return;
      }

      const riderData = riderDoc.data();
      const updatedBill = { ...riderData.bill };

      if (!updatedBill[selectedRiderMonthKey]) {
        alert("لا توجد فاتورة لهذا الشهر");
        return;
      }
  
      if (updatedBill[selectedRiderMonthKey].paid) {
        alert("تم دفع هذه الفاتورة بالفعل");
        return;
      }

      const batch = writeBatch(DB);

      // Update the bill's paid status and set payment_mode
      updatedBill[selectedRiderMonthKey] = {
        ...updatedBill[selectedRiderMonthKey],
        paid: true,
        payment_mode: paymentMode, // ✅ Save selected payment mode
      };

      batch.update(riderRef, { bill: updatedBill });

      // Commit batch update
      await batch.commit();

      // Update local state (Optimistic update)
      setSelectedRider((prev) => ({
        ...prev,
        bill: {
          ...prev.bill,
          [selectedRiderMonthKey]: {
            ...prev.bill[selectedRiderMonthKey],
            paid: true,
            payment_mode: paymentMode,
          }
        }
      }));

      alert("تم تحديث حالة الدفع بنجاح");
  
    } catch (error) {
      console.error("Error updating payment status:", error);
      alert("حدث خطأ أثناء تحديث حالة الدفع");
    } finally {
      setIsEditingPaymentStatus(false); // Stop loading
    }
  }

  // Export riders list as excel file
  const exportToExcel = () => {
    // Define the file name based on selected month and year
    const fileName = `Sayartech_Riders_${selectedYear}-${String(selectedMonth).padStart(2, "0")}.xlsx`;
    const sheetName = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
  
    // Prepare Data for Export
    const data = filteredRiders.map((rider) => {
      const billData = rider.bill?.[currentMonthKey] || {};
      const complementaryBills = rider.complementary_bill?.[currentMonthKey] || [];

      const driverCommission = billData?.driver_commission_amount || 0;
      const companyCommission = billData?.company_commission_amount || 0;
      const complementaryTotal = complementaryBills.reduce((sum, { amount }) => sum + amount, 0);
      let totalAmount = driverCommission + companyCommission + complementaryTotal;
      
      return {
        "الاسم": rider.full_name,
        "الاشتراك الشهري (دينار)": totalAmount.toLocaleString(),
        "الحالة": billData.paid ? "مدفوع" : "غير مدفوع",
      };
    });
  
    // Convert Data to a Worksheet
    const ws = XLSX.utils.json_to_sheet(data);
  
    // Create Workbook and Append Sheet
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
    // Save File
    XLSX.writeFile(wb, fileName);
  };
  
  return (
    <div className='white_card-section-container'>
      {selectedRider ? (
        <div className="item-detailed-data-container">

          <div className="item-detailed-data-header">
            <div className='item-detailed-data-header-title'>
              <h5>{selectedRider.phone_number || '-'}</h5>
              <h5 style={{marginLeft:'5px',marginRight:'5px'}}>-</h5>
              <h5 style={{marginRight:'4px'}}>{selectedRider.family_name}</h5>
              <h5>{selectedRider.parent_full_name || selectedRider.full_name}</h5>
            </div>
            <button className="info-details-back-button" onClick={goBack}>
              <BsArrowLeftShort size={24}/>
            </button>
          </div>

          <div className="item-detailed-data-main">
            <div className="student-detailed-data-main-firstBox">
              <div>
                <h5 style={{marginLeft:'4px'}}>{selectedRider.full_name}</h5>
                <h5 style={{marginLeft:'4px'}}>-</h5>
                <h5 style={{marginLeft:'4px'}}>{selectedRider.birth_date ? calculateAge(selectedRider.birth_date) : '-'}</h5>
                <h5 style={{marginLeft:'10px'}}>سنة</h5>
              </div>
              <div>
                <h5>{selectedRider.destination || '-'}</h5>
              </div>
              <div>
                <h5 style={{marginLeft:'4px'}}>{selectedRider.home_address || '-'}</h5>
                <h5 style={{marginLeft:'4px'}}>-</h5>
                <h5>{selectedRider.street || '-'}</h5>
              </div>
              <div>
                <h5 style={{marginLeft:'4px'}}>{selectedRider.city || '-'}</h5>
                <h5 style={{marginLeft:'4px'}}>-</h5>
                <h5>{selectedRider.state || '-'}</h5>
              </div>
              <div>
                <h5 style={{marginLeft:'10px'}}>{selectedRider.car_type || '-'}</h5>
                <Image src={miniVan} width={22} height={22} alt='minivan'/>
              </div>
              <div>
                <h5 style={{marginLeft:'5px'}}>
                  {selectedRider.monthly_sub ? Number(selectedRider.monthly_sub).toLocaleString('en-US') : '0'}
                </h5>
                <h5 style={{marginLeft:'10px'}}>دينار</h5>
                <Image src={money} style={{marginLeft:'20px'}} width={18} height={18} alt='money'/>
                <h5 className="rider-edit-bill-btn" onClick={() => openMonthlySubsModal(selectedRider)}>
                  تعديل
                </h5>
                <Modal
                  title='الاشتراك الشهري'
                  open={monthlySubsModal}
                  onCancel={handleCloseMonthlySubsModal}
                  centered
                  footer={null}
                >
                  <div style={{ height: '500px', width:'100%',display:'flex',justifyContent:'center',alignItems:'center',margin:'0px' }}>
                    <div className='student-edit-monthly-subs-container'>
                      <div>
                        <h5>المبلغ الجملي</h5>
                        <input 
                          value={formatNumber(totalSubAmount)}
                          onChange={(e) => handleTotalSubAmountChange(e.target.value)}
                          type='text'
                        />
                      </div>
                      <div>
                        <h5>حصة الشركة</h5>
                        <input 
                          value={formatNumber(companyCommission)}
                          onChange={(e) => handleCompanyCommissionChange(e.target.value)}
                          type='text'
                        />
                      </div>
                      <div>
                        <h5>حصة السائق</h5>
                        <input 
                          value={formatNumber(driverCommission)}
                          type='text'
                          readOnly
                        />
                      </div>
                      <div style={{textAlign:'center',marginTop:'20px'}}>
                        {editMonthlyFeeLoading ? (
                          <div style={{ width:'80px',height:'30px',backgroundColor:' #955BFE',borderRadius:'10px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                            <ClipLoader
                              color={'#fff'}
                              loading={editMonthlyFeeLoading}
                              size={10}
                              aria-label="Loading Spinner"
                              data-testid="loader"
                            />
                          </div>
                        ) : (
                          <button className='student-edit-monthly-subs-btn' onClick={() => editStudentMonthlyFee()}>تاكيد</button>
                        )}
                      </div>
                    </div>
                  </div>
                </Modal>
              </div>
            </div>
            <div className="student-detailed-data-main-second-box">
              <div className="main-second-box-year">
                <h5>{year}</h5>
              </div>
              <div className="main-second-box-month">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                  const isFutureMonth = month > new Date().getMonth() + 1;
                  return(
                    <button
                      key={month}
                      className={`month-button ${riderDeatilSelectedMonth === month ? "selected-month" : ""}`}
                      onClick={() => setRiderDeatilSelectedMonth(month)}
                      disabled={isFutureMonth} // Disable button
                      style={{
                        cursor: isFutureMonth ? "not-allowed" : "pointer",
                        opacity: isFutureMonth ? 0.5 : 1,
                      }}
                    >
                      {month}
                    </button>
                  )                 
                })}
              </div>
              {/* Bill Information */}
              <div className="rider-bill-info">
                {selectedRider.bill?.[selectedRiderMonthKey] ? (() => {

                  // Extract bill data
                  const billData = selectedRider.bill[selectedRiderMonthKey];
                  const complementaryBills = selectedRider.complementary_bill?.[selectedRiderMonthKey] || [];
                  const driverId = selectedRider.driver_id;
                  const startDate = billData?.start_date ? new Date(billData.start_date) : null;
                  const endDate = billData?.end_date ? new Date(billData.end_date) : null;

                  // Arabic month names
                  const arabicMonths = [
                    "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو",
                    "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"
                  ];

                  // Function to get last day of the month
                  const getLastDayOfMonth = (year, month) => new Date(year, month, 0).getDate();
                  const lastDayOfMonth = getLastDayOfMonth(year, riderDeatilSelectedMonth);

                  let totalDays = 0;
                  let startDay = 1;
                  let endDay = lastDayOfMonth;
                  let startMonth = arabicMonths[riderDeatilSelectedMonth - 1];                
                  let endMonth = arabicMonths[riderDeatilSelectedMonth - 1];

                  // Check if the rider was active this month
                  if (billData?.active === false) {
                    return(
                      <div className='rider-no-bill-usage'>
                        <h5>الراكب لم يستخدم خدمتنا في هذا الشهر</h5>
                        <div style={{display:'flex'}}>                      
                          <h5 style={{marginRight:'5px'}}>دينار</h5>
                          <h5>0</h5>
                        </div>                    
                      </div>
                    )
                  }
                
                  // Case 1: Rider didn't use the service at all
                  if (!driverId && !endDate) {
                    return (
                      <div className='rider-no-bill-usage'>
                        <h5>الراكب لم يستخدم خدمتنا في هذا الشهر</h5>
                        <div style={{display:'flex'}}>                      
                          <h5 style={{marginRight:'5px'}}>دينار</h5>
                          <h5>0</h5>
                        </div>                      
                      </div>
                    )
                  }

                   // Case 2: Rider used the service but stopped (end_date is set)
                  if (!startDate && endDate) {
                    startDay = 1;
                    endDay = endDate.getDate();
                    totalDays = endDay - startDay + 1;
                  } 
                  // Case 3: Defined start_date and end_date
                  else if (startDate && endDate) {
                    startDay = startDate.getDate();
                    endDay = endDate.getDate();
                    totalDays = endDay - startDay + 1;
                  } 
                  // Case 4: Rider started using the service mid-month and continued
                  else if (startDate && !endDate) {
                    startDay = startDate.getDate();
                    totalDays = endDay - startDay + 1;
                  }
                  // Normal use case rider used the full month
                  else if (!startDate && !endDate) {
                    totalDays = lastDayOfMonth;
                  }

                  // Calculate the total amount
                  const driverCommission = billData.driver_commission_amount || 0;
                  const companyCommission = billData.company_commission_amount || 0;
                  let totalAmount = driverCommission + companyCommission;

                  // Complementary Bill Total
                  let complementaryTotal = complementaryBills.reduce((sum, { amount }) => sum + amount, 0);
                  totalAmount += complementaryTotal;

                  return (
                    <div style={{width:'100%'}}>
                      <div>
                        <h5>{totalDays}</h5>
                        <h5 style={{marginLeft:'5px'}}>عدد الايام </h5>                       
                      </div>

                      <div>
                        <h5>من {startDay} {startMonth} إلى {endDay} {endMonth}</h5>
                      </div>

                      <div>
                        <h5>حصة السائق: {billData.driver_commission_amount?.toLocaleString()} دينار</h5>
                      </div>
                      <div>
                        <h5>حصة الشركة: {billData.company_commission_amount?.toLocaleString()} دينار</h5>  
                      </div>
                      
                      {complementaryBills.length > 0 && (
                        <div className='rider-complement-bill'>
                          <h5 style={{marginLeft:'10px'}}>الفاتورة التكميلية: {complementaryTotal.toLocaleString()} دينار</h5>
                          <h5 
                            onClick={() => setShowCompBillModal(true)}
                            className='rider-complement-bill-btn'
                            >التفاصيل</h5>
                        </div>
                      )}
                
                      <Modal 
                        title="تفاصيل الفاتورة التكميلية"
                        open={showCompBillModal}
                        onCancel={handleCloseComBillModal}
                        footer={null}
                        centered                      
                      >
                        {complementaryBills.map(({ start_date, end_date, amount }, index) => {
                          const compStart = new Date(start_date);
                          const compEnd = new Date(end_date);
                          return (
                            <div key={index} className='rider-complement-bill-details'>
                              <p>
                                من {compStart.getDate()} {arabicMonths[compStart.getMonth()]} إلى {compEnd.getDate()} {arabicMonths[compEnd.getMonth()]}
                              </p>
                              <p>المبلغ: {amount.toLocaleString()} دينار</p>
                            </div>
                          );
                        })}
                      </Modal>

                    
                      <div style={{ borderTop: "1px solid black", marginTop: "10px",marginBottom:'10px',paddingTop: "10px" }}>
                        <h5>المبلغ الإجمالي: {totalAmount.toLocaleString()} دينار</h5>
                      </div>

                      {!billData.paid && (
                        <div className='rider-complement-bill' style={{marginBottom:'10px'}}>
                          <select
                            value={paymentMode} 
                            onChange={(e) => setPaymentMode(e.target.value)}
                          >
                            <option value=''>طريقة الدفع</option>
                            <option value='cash'>نقد</option>
                            <option value='bank'>تحويل بنكي</option>
                          </select>
                        </div>
                      )}
                                         
                      <div className='rider-complement-bill'>
                        <h5  style={{marginLeft:'10px'}}>{billData.paid ? "مدفوعة" : "غير مدفوعة"}</h5>
                        {!billData.paid ? (
                          <>
                            {isEditingPaymentStatus ? (
                              <div style={{ width:'60px',height:'25px',backgroundColor:'#007bff',borderRadius:'7px',display:'flex',alignItems:'center',justifyContent:'center'}}>
                                <ClipLoader
                                  color={'#fff'}
                                  loading={isEditingPaymentStatus}
                                  size={10}
                                  aria-label="Loading Spinner"
                                  data-testid="loader"
                                />
                              </div>
                            ) : (
                              <h5 
                                className='rider-edit-bill-btn'
                                onClick={editBillPayedStatusHandler}
                              >
                                دفع
                              </h5>
                            )}                          
                          </>                        
                        ) : (
                          <FcOk size={18}/>
                        )}                       
                      </div>

                      {billData.paid && (
                        <div className='rider-complement-bill'>
                          <h5>طريقة الدفع</h5>
                          <h5 style={{marginRight:'7px',fontWeight:'bold'}}>{billData?.payment_mode === 'cash' ? 'نقد' : 'تحويل بنكي'}</h5>
                        </div>
                      )}

                    </div>
                  );
                })() : (
                  <h5>لا يوجد فاتورة لهذا الشهر</h5>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className='students-section-inner'>
          <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
              <button className='excel-btn' onClick={exportToExcel}>
                <Image src={excel} width={20} height={20} alt='excel'/>
              </button>
              <div className='months-btn-container'>
                <button 
                  onClick={handlePrevMonth}
                  disabled={selectedMonth === 1}
                  className="month-nav-btn"
                  style={{ opacity: selectedMonth === 1 ? 0.5 : 1 }}
                >
                  <IoIosArrowBack size={22}/>             
                </button>
                <div className="current-month">
                  <p>{format(new Date(selectedYear, selectedMonth - 1), 'MMMM yyyy', { locale: ar })}</p>
                </div>       
                <button 
                  onClick={handleNextMonth}
                  disabled={selectedMonth >= new Date().getMonth() + 1}
                  className="month-nav-btn"
                  style={{ opacity: selectedMonth >= new Date().getMonth() + 1 ? 0.5 : 1 }}
                >
                  <IoIosArrowForward size={22}/>
                </button>
              </div>
              
            </div>
          </div>
          <div className='students-section-inner-titles'>
            <div className='students-section-inner-title'>
              <input 
                placeholder='الاسم' 
                type='text' 
                value={nameFilter}
                onChange={(e) => setNameFilter(e.target.value)}
              />
            </div>
            <div className='students-section-inner-title'>
              <input 
                placeholder='الاشتراك الشهري'
                type='text' 
                value={monthlyAmountFilter}
                onChange={(e) => setMonthlyAmountFilter(e.target.value)}
              />
            </div>
            <div className="students-section-inner-title">
              <select 
                value={paidFilter} 
                onChange={(e) => setPaidFilter(e.target.value)}
                className="students-section-inner-title_search_input"
              >
                <option value="">الحالة</option>
                <option value="yes">مدفوع</option>
                <option value="no">غير مدفوع</option>
              </select>
            </div>
          </div>
          <div>
            {filteredRiders.map((rider => {
              const billData = rider.bill?.[currentMonthKey];
              const complementaryBills = rider.complementary_bill?.[currentMonthKey] || [];
              const driverId = rider.driver_id;

              const startDate = billData?.start_date ? new Date(billData.start_date) : null;
              const endDate = billData?.end_date ? new Date(billData.end_date) : null;

              const getLastDayOfMonth = (year, month) => new Date(year, month, 0).getDate();
              const lastDayOfMonth = getLastDayOfMonth(year, selectedMonth);

              let totalAmount = 0;
              let totalDays = 0;

              if (billData?.active === false) {
                totalAmount = 0;
              } else if (!driverId && !endDate) {
                totalAmount = 0;
              } else {
                // Rider used service but stopped (end_date is set)
                if (!startDate && endDate) {
                  totalDays = endDate.getDate();
                } 
                // Rider used service normally with start_date and end_date
                else if (startDate && endDate) {
                  totalDays = endDate.getDate() - startDate.getDate() + 1;
                } 
                // Rider started using mid-month and continued
                else if (startDate && !endDate) {
                  totalDays = lastDayOfMonth - startDate.getDate() + 1;
                } 
                // Rider used the full month (start_date and end_date are null)
                else if (!startDate && !endDate) {
                  totalDays = lastDayOfMonth;
                }

                const driverCommission = billData?.driver_commission_amount || 0;
                const companyCommission = billData?.company_commission_amount || 0;

                // Calculate total bill amount (including complementary bills)
                const complementaryTotal = complementaryBills.reduce((sum, { amount }) => sum + amount, 0);
                totalAmount = driverCommission + companyCommission + complementaryTotal;
              }

              return(
                <div key={rider.id} onClick={() => selectRider(rider)} className='single-item'>
                  <div>
                    <h5>{rider.full_name}</h5>
                  </div>

                  <div>
                    {billData ? (
                      <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center" }}>
                        <h5 style={{ marginLeft: "5px" }}>{totalAmount.toLocaleString()}</h5>
                        <h5>دينار</h5>
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "row-reverse", alignItems: "center", justifyContent: "center" }}>
                        <FcMediumPriority />
                      </div>
                    )}
                  </div>
                
                  <div>
                    <h5 className={billData?.paid ? "paid-status":"unpaid-status"}>
                      {billData?.paid ? "مدفوع" : "غير مدفوع"}
                    </h5>
                  </div>
                </div>
              )
            }))}
          </div>
        </div>
      )}
    </div>
  )
}

export default riders