import React,{useState} from 'react'
import { useGlobalState } from '../globalState'
import { format, subMonths, addMonths } from 'date-fns'
import { ar } from 'date-fns/locale'
import { IoIosArrowBack } from "react-icons/io"
import { IoIosArrowForward } from "react-icons/io"
import { Progress,Flex } from "antd"

const main = () => {
  const { riders } = useGlobalState()

  const today = new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Baghdad" }));
  const year = today.getFullYear();

  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1)

  const currentMonthKey = `${year}-${String(selectedMonth).padStart(2, "0")}`

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

  // Initialize Total Amounts
  let totalCompanyRevenue = 0;
  let totalDriverCommission = 0;
  let paidSubscriptions = 0;
  let totalRiders = riders.length;
  let cashPayments = 0;
  let bankPayments = 0;

  // Loop through all riders
  riders.forEach((rider) => {
    const bill = rider.bill?.[currentMonthKey];

    if (bill?.active) {
      totalCompanyRevenue += bill.company_commission_amount || 0;
      totalDriverCommission += bill.driver_commission_amount || 0;

      // Count paid subscriptions
      if (bill.paid) {
        paidSubscriptions++;
        if (bill.payment_mode === "cash") {
          cashPayments++;
        } else if (bill.payment_mode === "bank") {
          bankPayments++;
        }
      }
    }

    // Check for complementary bill and add its amount to the driver's commission
    const complementaryBills = rider?.complementary_bill?.[currentMonthKey] || [];
    const totalComplementaryAmount = complementaryBills.reduce((sum, bill) => sum + (bill.amount || 0), 0);
    totalDriverCommission += totalComplementaryAmount;
  });

  // Calculate Total Amount as Sum of Both Commissions
  let totalAmount = totalCompanyRevenue + totalDriverCommission;

  // Calculate Paid Subscription Percentage
  let paidPercentage = totalRiders > 0 ? (paidSubscriptions / totalRiders) * 100 : 0;

  // Calculate Payment Method Percentages
  let cashPercentage = paidSubscriptions > 0 ? (cashPayments / paidSubscriptions) * 100 : 0;
  let bankPercentage = paidSubscriptions > 0 ? (bankPayments / paidSubscriptions) * 100 : 0;
 
  return (
    <div className='main_section_stat'>
      <div className='stats-section-inner-titles'>
        <div className='students-section-inner-title'>
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
              disabled={selectedMonth >= new Date().getMonth() + 1} // Prevent going beyond current month
              className="month-nav-btn"
              style={{ opacity: selectedMonth >= new Date().getMonth() + 1 ? 0.5 : 1 }}
            >
              <IoIosArrowForward size={22}/>
            </button>
          </div>
        </div>
      </div>

      <div className='stats-section-inner-first-box'>
        <p>الإحصاءات الإجمالية</p>
        <div className='stats-section-inner-first-box-sections'>
          <div>
            <div className='stats-section-inner-first-box-sections-amount'>
              <h4>{totalAmount.toLocaleString()}</h4>
              <h4>دينار</h4>
            </div>                      
            <h5>العائد الجملي</h5>
          </div>

          <div>
            <div className='stats-section-inner-first-box-sections-amount'>
              <h4>{totalDriverCommission.toLocaleString()}</h4>
              <h4>دينار</h4>
            </div>
            <h5>اجور السواق</h5>            
          </div>

          <div>
            <div className='stats-section-inner-first-box-sections-amount'>
              <h4>{totalCompanyRevenue.toLocaleString()}</h4>
              <h4>دينار</h4>
            </div>            
            <h5>عائدات الشركة</h5>            
          </div>

        </div>       
      </div>

      <div className='stats-section-inner-second-box' style={{flexDirection:'row-reverse'}}>        
        <div className='stats-circular'>
          <Progress
            type="circle"
            percent={paidPercentage.toFixed(0)}
            format={(percent) => `${percent}%`}
            strokeColor="#955BFE"
          />
          <p style={{marginTop:'10px'}}>نسبة الاشتراكات المدفوعة</p>
        </div>

        <div className='stats-inline-bar'>
          <Flex gap="small" vertical>

          {/* Cash Payment Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ width:'100px',textAlign:'center'}}>
              <h5 style={{ color: "#955BFE" }}>نقد</h5>
            </div>          
            <Progress
              percent={cashPercentage}
              size={[150, 20]}
              strokeColor="#955BFE"
              format={() => `${bankPercentage.toFixed(0)}%`}
              showInfo={false} 
            />
            <h5 style={{ color: "#955BFE",width:'50px',textAlign:'center' }}>{cashPercentage.toFixed(0)}%</h5>
          </div>

          {/* Bank Payment Bar */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
            <div style={{ width:'100px',textAlign:'center'}}>
              <h5 style={{color: "#32CD32"}}>تحويل بنكي</h5>
            </div>          
            <Progress
              percent={bankPercentage}
              size={[150, 20]}
              strokeColor="#32CD32"
              format={() => `${cashPercentage.toFixed(0)}%`} 
              showInfo={false} 
            />
            <h5 style={{ color: "#32CD32",width:'50px',textAlign:'center' }}>{bankPercentage.toFixed(0)}%</h5>
          </div>
          </Flex>
          <p style={{ marginTop: "10px" }}>طريقة الدفع</p>
        </div>
      </div>
    </div>
  )
}

export default main