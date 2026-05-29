export function CSVstring_to_Array(data, delimiter = ',') {
   /* This variable will collect all the titles
   from the data variable
   ["Name", "Roll Number"] */
   
   const titles = data.slice(0, data.indexOf('\n')).replace(/\s/gm, '').split(delimiter);
   /* This variable will store the values
   from the data
   [ 'Rohan,01', 'Aryan,02' ] */
   const titleValues = data.slice(data.indexOf('\n') + 1).split('\n');

   
   /* Map function will iterate over all
   values of title values array and
   append each object at the end of
   the array */
    const ansArray = titleValues.map(function (v) {
        /* Values variable will store individual
           title values        
           [ 'Rohan', '01' ] */
        const values = v.split(delimiter);
        
        /* storeKeyValue variable will store
        object containing each title
        with their respective values i.e
        { Name: 'Rohan', 'Roll Number': '01' } */
        const storeKeyValue = titles.reduce(function (obj, title, index) {
           obj[title+""] = values[index];
           return obj;
         }, {});

         
         
         return storeKeyValue;
      });
      return ansArray;
   }
   