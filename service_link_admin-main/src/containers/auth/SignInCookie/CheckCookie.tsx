import React from 'react';
import Cookies from 'js-cookie';

function getDomainName() {
    // alert();
    var hostName = window.location.hostname;
    return hostName.substring(hostName.lastIndexOf(".", hostName.lastIndexOf(".") - 1) + 1);
}

export const App = () => {

    const smv_cms_key = 'smv_crm_token';
    const smv_crm_token = Cookies.get(smv_cms_key);
    
    if (smv_crm_token) {
        
        var this_domain = getDomainName();
        Cookies.remove(smv_cms_key, { path: '', domain: this_domain });
        
        const smv_crm_token_array = JSON.parse(smv_crm_token);

        localStorage.setItem("id_token", smv_crm_token_array.id_token);
        localStorage.setItem("rf_token", smv_crm_token_array.rf_token);

        var result = 'SignIn OK ... auto redirect after 3s';
    } else {
        result = 'signin_error...';
    }

    setTimeout(() => {
        window.location.replace('/dashboard');
      }, 3000);
    return (  
        <div>
            {result}
        </div> 
    );
    
    // return (
    //     <Redirect to='/dashboard' />
    // );

};
export default App
